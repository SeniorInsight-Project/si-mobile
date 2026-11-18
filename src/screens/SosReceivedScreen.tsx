import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar, { useEspacoBarraInferior } from '../components/BottomNavBar';
import SosLocationMap from '../components/SosLocationMap';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, typography, shadows, font, rounded } from '../theme';
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
  const espacoInferior = useEspacoBarraInferior();
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
      <AppHeader title="Pedido de socorro" onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: espacoInferior }]}>
        {carregando ? (
          <ActivityIndicator color={colors.primary} />
        ) : erroCarga ? (
          <View style={styles.erroBox} testID="sos-erro-carga">
            <Icon name="error" size={22} color={colors.coralDark} />
            <Text style={styles.erroTexto}>{erroCarga}</Text>
            <Button
              title="Tentar de novo"
              variant="secondary"
              iconLeft="refresh"
              fullWidth={false}
              onPress={carregar}
              testID="sos-tentar-de-novo"
            />
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
                  <Button
                    title={`Ligar para ${alarme.idosoNome}`}
                    iconLeft="call"
                    variant="sos"
                    size="xl"
                    onPress={ligarParaIdoso}
                    testID="sos-ligar-idoso"
                  />
                )}

                {alarme.status === 'DISPARADO' && (
                  <Button
                    title="Estou a caminho"
                    iconLeft="directions_car"
                    variant="primary"
                    size="xl"
                    loading={enviando}
                    disabled={enviando}
                    onPress={assumir}
                    testID="sos-assumir"
                  />
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
                  <Button
                    title="Encerrar chamado"
                    variant="outline"
                    onPress={() => setEscolhendoDesfecho(true)}
                    testID="sos-encerrar"
                  />
                )}

                {euAssumi && emAtendimento && escolhendoDesfecho && (
                  <View style={styles.desfechos} testID="sos-desfechos">
                    <Text style={styles.desfechoPergunta}>Como terminou?</Text>
                    {(Object.keys(ROTULOS_DESFECHO) as DesfechoSos[]).map((d) => (
                      <Button
                        key={d}
                        title={ROTULOS_DESFECHO[d]}
                        variant="outline"
                        disabled={enviando}
                        onPress={() => encerrar(d)}
                        testID={`sos-desfecho-${d.toLowerCase()}`}
                      />
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
  content: { padding: 16, gap: 16 },
  hero: { backgroundColor: colors.peachBg, borderWidth: 1, borderColor: colors.peachBorder, borderRadius: rounded.card, padding: 20, gap: 8 },
  chip: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 12, borderRadius: rounded.full, justifyContent: 'center' },
  chipTexto: { fontSize: 14,  color: colors.white, ...font('body', 700) },
  heroTitulo: { fontSize: 28, lineHeight: 34,  color: colors.primary, ...font('heading', 800) },
  heroTexto: { fontSize: 16, lineHeight: 24, color: colors.textPrimary, ...font('body', 400) },
  card: { backgroundColor: colors.white, borderRadius: rounded.card, padding: 20, gap: 14, ...shadows.tier1 },
  semMapa: { height: 200, borderRadius: rounded.xl, backgroundColor: colors.peachBg, alignItems: 'center', justifyContent: 'center', gap: 8 },
  semMapaTexto: { fontSize: 18,  color: colors.coralDark, ...font('heading', 800) },
  enderecoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  enderecoIcon: { width: 48, height: 48, borderRadius: rounded.full, backgroundColor: colors.peachBg, alignItems: 'center', justifyContent: 'center' },
  enderecoTitulo: { fontSize: 18, lineHeight: 24,  color: colors.primary, ...font('heading', 800) },
  enderecoSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, ...font('body', 400) },
  privacidade: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: rounded.lg, backgroundColor: colors.surfaceSubtle },
  privacidadeTexto: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary, ...font('body', 400) },
  ligar: { minHeight: 64, borderRadius: rounded.full, backgroundColor: colors.coralDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  assumir: { minHeight: 64, borderRadius: rounded.full, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  desabilitado: { opacity: 0.6 },
  botaoTexto: { fontSize: 18,  color: colors.white, ...font('heading', 700) },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: rounded.xl, backgroundColor: colors.mintBg },
  statusTitulo: { fontSize: 18,  color: colors.primary, ...font('heading', 800) },
  statusSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, ...font('body', 400) },
  secundario: { minHeight: 56, borderRadius: rounded.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  secundarioTexto: { fontSize: 18,  color: colors.primary, ...font('heading', 700) },
  desfechos: { gap: 10 },
  desfechoPergunta: { fontSize: 18,  color: colors.primary, ...font('heading', 800) },
  encerrado: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: rounded.xl, backgroundColor: colors.mintBg },
  encerradoTitulo: { fontSize: 18,  color: colors.primary, ...font('heading', 800) },
  encerradoSub: { fontSize: 14, color: colors.textSecondary, ...font('body', 400) },
  avisoRede: { fontSize: 14, lineHeight: 20,  color: colors.coralDark, ...font('body', 700) },
  eyebrow: { fontSize: 14,  color: colors.textSecondary, ...font('body', 600) },
  indisponivel: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: rounded.lg, backgroundColor: colors.peachBg },
  indisponivelTexto: { flex: 1, fontSize: 14, lineHeight: 20,  color: colors.coralDark, ...font('body', 600) },
  erroBox: { alignItems: 'center', gap: 12, padding: 24, borderRadius: rounded.xl, backgroundColor: colors.white, ...shadows.tier1 },
  erroTexto: { fontSize: 16, lineHeight: 24, textAlign: 'center', color: colors.coralDark,  ...font('body', 700) },
  semChamadoTexto: { fontSize: 16, color: colors.textSecondary, ...font('body', 400) },
  tentar: { minHeight: 48, paddingHorizontal: 24, borderRadius: rounded.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tentarTexto: { fontSize: 16,  color: colors.white, ...font('heading', 700) },
});
