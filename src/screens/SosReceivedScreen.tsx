import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import SosLocationMap from '../components/SosLocationMap';
import Icon from '../components/Icon';
import { colors, typography, shadows } from '../theme';
import {
  AlarmeRecebido,
  DesfechoSos,
  ROTULOS_DESFECHO,
  SosError,
  assumirChamado,
  buscarAlarme,
  buscarAlarmeAtivo,
  descreverLocalizacao,
  encerrarChamado,
} from '../services/sosRecebidoService';

export interface SosReceivedScreenProps {
  onNavigate: (screen: string) => void;
  idosoId: string;
  /** Chamado escolhido na Central de Alertas; sem ele, abre o chamado em aberto do idoso. */
  alarmeId?: string | null;
  /** Telefone do idoso, quando conhecido. Sem ele não há botão de ligar (nada é inventado). */
  telefoneIdoso?: string;
}

const hora = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Figma: "SOS Recebido" (HU-065, HU-066, HU-068, RN-009). Só o familiar chega aqui.
 * O estado do chamado é o do servidor: nada vale só no aparelho.
 */
export default function SosReceivedScreen({ onNavigate, idosoId, alarmeId = null, telefoneIdoso }: SosReceivedScreenProps) {
  const [alarme, setAlarme] = useState<AlarmeRecebido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [euAssumi, setEuAssumi] = useState(false);
  const [desfecho, setDesfecho] = useState<DesfechoSos | null>(null);
  const [escolhendoDesfecho, setEscolhendoDesfecho] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga('');
    try {
      setAlarme(alarmeId ? await buscarAlarme(alarmeId) : await buscarAlarmeAtivo(idosoId));
    } catch (e) {
      setAlarme(null);
      setErroCarga(e instanceof SosError ? e.message : 'Não foi possível carregar o chamado agora.');
    } finally {
      setCarregando(false);
    }
  }, [alarmeId, idosoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const ligarParaIdoso = () => {
    if (!telefoneIdoso) return;
    Linking.openURL(`tel:${telefoneIdoso.replace(/\D/g, '')}`).catch(() =>
      Alert.alert('Discador indisponível', `Ligue manualmente: ${telefoneIdoso}`)
    );
  };

  const assumir = async () => {
    if (!alarme || enviando) return;
    setEnviando(true);
    setAviso('');
    try {
      const { alarme: atualizado, resultado } = await assumirChamado(alarme.id);
      setAlarme(atualizado);
      if (resultado === 'ASSUMIDO') setEuAssumi(true);
      if (resultado === 'JA_ASSUMIDO') setAviso('Outro familiar acabou de assumir este chamado.');
      if (resultado === 'ENCERRADO') setAviso('Este chamado já foi encerrado.');
    } catch (e) {
      setAviso(e instanceof SosError ? e.message : 'Não foi possível assumir agora.');
    } finally {
      setEnviando(false);
    }
  };

  const encerrar = async (escolhido: DesfechoSos) => {
    if (!alarme || enviando) return;
    setEnviando(true);
    setAviso('');
    try {
      setAlarme(await encerrarChamado(alarme.id, escolhido));
      setDesfecho(escolhido);
      setEscolhendoDesfecho(false);
    } catch (e) {
      setAviso(e instanceof SosError ? e.message : 'Não foi possível encerrar agora.');
    } finally {
      setEnviando(false);
    }
  };

  const encerrado = alarme?.status === 'RESOLVIDO' || alarme?.status === 'CANCELADO';
  const emAtendimento = alarme?.status === 'EM_ATENDIMENTO';
  const outroAssumiu = emAtendimento && !euAssumi;
  const local = alarme ? descreverLocalizacao(alarme) : null;

  const chip =
    !alarme || alarme.status === 'DISPARADO'
      ? { texto: 'SOS • AGORA', fundo: colors.coralDark }
      : emAtendimento
        ? { texto: 'EM ATENDIMENTO', fundo: colors.primary }
        : { texto: 'ENCERRADO', fundo: colors.textSecondary };

  return (
    <ScreenWrapper>
      <AppHeader title="Pedido de Socorro" onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={styles.content}>
        {carregando ? (
          <ActivityIndicator color={colors.primary} />
        ) : erroCarga ? (
          <View style={styles.erroBox} testID="sos-erro-carga">
            <Icon name="error" size={22} color={colors.coralDark} />
            <Text style={styles.erroTexto}>{erroCarga}</Text>
            <TouchableOpacity style={styles.tentar} onPress={carregar} accessibilityRole="button" testID="sos-tentar-de-novo">
              <Text style={styles.tentarTexto}>Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        ) : !alarme ? (
          <View style={styles.erroBox} testID="sos-sem-chamado">
            <Icon name="check_circle" size={22} color={colors.successDark} />
            <Text style={styles.semChamadoTexto}>Nenhum chamado em aberto.</Text>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={[styles.chip, { backgroundColor: chip.fundo }]} testID="sos-chip">
                <Text style={styles.chipTexto}>{chip.texto}</Text>
              </View>
              <Text style={styles.heroTitulo}>{alarme.idosoNome} pediu ajuda</Text>
              <Text style={styles.heroTexto}>
                Disparado às {hora(alarme.disparadoEm)}. O alarme toca mesmo no modo silencioso, se você autorizou.
              </Text>
            </View>

            <View style={styles.card}>
              {alarme.localizacao ? (
                <SosLocationMap latitude={alarme.localizacao.latitude} longitude={alarme.localizacao.longitude} />
              ) : (
                <View style={styles.semMapa} testID="sos-sem-localizacao">
                  <Icon name="location_off" size={40} color={colors.coralDark} />
                  <Text style={styles.semMapaTexto}>Localização indisponível</Text>
                </View>
              )}

              <View style={styles.enderecoRow}>
                <View style={styles.enderecoIcon}>
                  <Icon name="location_on" size={22} color={colors.coralDark} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.enderecoTitulo} testID="sos-endereco">
                    {local?.titulo}
                  </Text>
                  <Text style={styles.enderecoSub}>{local?.detalhe}</Text>
                </View>
              </View>

              <View style={styles.privacidade}>
                <Icon name="location_off" size={18} color={colors.textSecondary} />
                <Text style={styles.privacidadeTexto}>
                  A localização foi enviada só por causa deste pedido de socorro e deixa de ser atualizada quando o
                  chamado termina.
                </Text>
              </View>
            </View>

            {encerrado ? (
              <View style={styles.encerrado} testID="sos-encerrado">
                <Icon name="check_circle" size={24} color={colors.successDark} />
                <View style={styles.flex}>
                  <Text style={styles.encerradoTitulo}>Chamado encerrado</Text>
                  <Text style={styles.encerradoSub}>
                    {desfecho ? `Desfecho: ${ROTULOS_DESFECHO[desfecho]}` : alarme.status === 'CANCELADO' ? 'Cancelado' : 'Resolvido'}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {Boolean(telefoneIdoso) && (
                  <TouchableOpacity style={styles.ligar} onPress={ligarParaIdoso} accessibilityRole="button" testID="sos-ligar-idoso">
                    <Icon name="call" size={22} color={colors.white} />
                    <Text style={styles.botaoTexto}>Ligar para {alarme.idosoNome}</Text>
                  </TouchableOpacity>
                )}

                {alarme.status === 'DISPARADO' && (
                  <TouchableOpacity
                    style={[styles.assumir, enviando && styles.desabilitado]}
                    onPress={assumir}
                    disabled={enviando}
                    accessibilityRole="button"
                    testID="sos-assumir"
                  >
                    {enviando ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Icon name="directions_car" size={22} color={colors.white} />
                        <Text style={styles.botaoTexto}>Estou a caminho</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {euAssumi && emAtendimento && (
                  <View style={styles.status} testID="sos-voce-assumiu">
                    <Icon name="directions_car" size={24} color={colors.successDark} />
                    <View style={styles.flex}>
                      <Text style={styles.statusTitulo}>Você está a caminho</Text>
                      <Text style={styles.statusSub}>O chamado está em atendimento.</Text>
                    </View>
                  </View>
                )}

                {outroAssumiu && (
                  <View style={styles.status} testID="sos-outro-assumiu">
                    <Icon name="directions_car" size={24} color={colors.successDark} />
                    <View style={styles.flex}>
                      <Text style={styles.statusTitulo}>Um familiar já está a caminho</Text>
                      <Text style={styles.statusSub}>Este chamado já foi assumido por alguém da rede.</Text>
                    </View>
                  </View>
                )}

                {euAssumi && emAtendimento && !escolhendoDesfecho && (
                  <TouchableOpacity
                    style={styles.secundario}
                    onPress={() => setEscolhendoDesfecho(true)}
                    accessibilityRole="button"
                    testID="sos-encerrar"
                  >
                    <Text style={styles.secundarioTexto}>Encerrar chamado</Text>
                  </TouchableOpacity>
                )}

                {euAssumi && emAtendimento && escolhendoDesfecho && (
                  <View style={styles.desfechos} testID="sos-desfechos">
                    <Text style={styles.desfechoPergunta}>Como terminou?</Text>
                    {(Object.keys(ROTULOS_DESFECHO) as DesfechoSos[]).map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.secundario, enviando && styles.desabilitado]}
                        onPress={() => encerrar(d)}
                        disabled={enviando}
                        accessibilityRole="button"
                        testID={`sos-desfecho-${d.toLowerCase()}`}
                      >
                        <Text style={styles.secundarioTexto}>{ROTULOS_DESFECHO[d]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {Boolean(aviso) && (
              <Text style={styles.avisoRede} accessibilityRole="alert" testID="sos-aviso">
                {aviso}
              </Text>
            )}

            {!alarme.localizacao && (
              <View style={styles.card}>
                <Text style={styles.eyebrow}>SE O CELULAR NÃO OBTIVER A LOCALIZAÇÃO</Text>
                <View style={styles.indisponivel}>
                  <Icon name="location_off" size={20} color={colors.coralDark} />
                  <Text style={styles.indisponivelTexto}>
                    Localização indisponível. Ligue para {alarme.idosoNome} ou para o contato de emergência.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <BottomNavBar currentScreen="SosReceived" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  hero: { backgroundColor: colors.peachBg, borderWidth: 1, borderColor: colors.peachBorder, borderRadius: 24, padding: 20, gap: 8 },
  chip: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 12, borderRadius: 9999, justifyContent: 'center' },
  chipTexto: { fontSize: 14, fontWeight: '800', color: colors.white, fontFamily: typography.fontFamily.body },
  heroTitulo: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  heroTexto: { fontSize: 16, lineHeight: 24, color: colors.onSurface, fontFamily: typography.fontFamily.body },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 20, gap: 14, ...shadows.tier1 },
  semMapa: { height: 200, borderRadius: 20, backgroundColor: colors.peachBg, alignItems: 'center', justifyContent: 'center', gap: 8 },
  semMapaTexto: { fontSize: 18, fontWeight: '800', color: colors.coralDark, fontFamily: typography.fontFamily.heading },
  enderecoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  enderecoIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.peachBg, alignItems: 'center', justifyContent: 'center' },
  enderecoTitulo: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  enderecoSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  privacidade: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surfaceSubtle },
  privacidadeTexto: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  ligar: { minHeight: 64, borderRadius: 9999, backgroundColor: colors.coralDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  assumir: { minHeight: 64, borderRadius: 9999, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  desabilitado: { opacity: 0.6 },
  botaoTexto: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 20, backgroundColor: colors.mintBg },
  statusTitulo: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  statusSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  secundario: { minHeight: 56, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  secundarioTexto: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  desfechos: { gap: 10 },
  desfechoPergunta: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  encerrado: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 20, backgroundColor: colors.mintBg },
  encerradoTitulo: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  encerradoSub: { fontSize: 14, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  avisoRede: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: colors.coralDark, fontFamily: typography.fontFamily.body },
  eyebrow: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  indisponivel: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.peachBg },
  indisponivelTexto: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.coralDark, fontFamily: typography.fontFamily.body },
  erroBox: { alignItems: 'center', gap: 12, padding: 24, borderRadius: 20, backgroundColor: colors.white, ...shadows.tier1 },
  erroTexto: { fontSize: 16, lineHeight: 24, textAlign: 'center', color: colors.coralDark, fontWeight: '700', fontFamily: typography.fontFamily.body },
  semChamadoTexto: { fontSize: 16, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  tentar: { minHeight: 48, paddingHorizontal: 24, borderRadius: 9999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tentarTexto: { fontSize: 16, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
});
