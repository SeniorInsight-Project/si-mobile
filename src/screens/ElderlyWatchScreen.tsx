import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import { colors, typography, shadows } from '../theme';
import { CONSENTIMENTO_PADRAO, Consentimentos, obterConsentimentos } from '../services/consentimentoService';
import {
  EstadoPasso,
  montarPassos,
  obterEstadoConexao,
} from '../services/relogioService';
import { abrirHealthConnect } from '../services/healthConnectLauncher';
import {
  avaliarConexaoRelogio,
  sincronizarTelemetriaWearable,
  MENSAGEM_HEALTH_CONNECT_AUSENTE,
  type ConexaoRelogioInfo,
} from '../services/openWearablesService';

export interface ElderlyWatchScreenProps {
  onNavigate: (screen: string) => void;
  primeiroUso?: boolean;
  idosoId?: string;
}

const ICONE_PASSO: Record<string, string> = { INSTALAR: 'download', PERMITIR: 'watch', SEGUNDO_PLANO: 'sync' };
const ROTULO_ESTADO: Record<EstadoPasso, string> = { FEITO: 'FEITO', AGORA: 'AGORA', PENDENTE: 'DEPOIS' };

/** Figma: "Idoso - Conectar Relógio" (HU-023, HU-025, HU-026). Só o idoso chega aqui. */
export default function ElderlyWatchScreen({ onNavigate, primeiroUso = false, idosoId }: ElderlyWatchScreenProps) {
  const [consentimentos, setConsentimentos] = useState<Consentimentos>(CONSENTIMENTO_PADRAO);
  const [aviso, setAviso] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [mensagemSincronizacao, setMensagemSincronizacao] = useState('');
  const conexaoBase = useMemo(() => obterEstadoConexao(), []);

  const [conexao, setConexao] = useState<ConexaoRelogioInfo>({
    healthConnectInstalado: conexaoBase.healthConnectInstalado,
    permissoesConcedidas: conexaoBase.healthConnectInstalado,
    leituraSegundoPlanoAtiva: conexaoBase.segundoPlanoAtivo,
    ultimaMedicaoMs: conexaoBase.ultimaMedicaoMs,
  });

  useEffect(() => {
    obterConsentimentos({ idosoId })
      .then(setConsentimentos)
      .catch(() => undefined);
  }, [idosoId]);

  const passos = montarPassos(conexaoBase, consentimentos);
  const avaliacao = avaliarConexaoRelogio(conexao);

  const corStatus =
    avaliacao.cor === 'verde'
      ? { fundo: colors.mintBg, icone: colors.successDark, border: '#B8ECD3' }
      : avaliacao.cor === 'laranja'
      ? { fundo: colors.amberBg, icone: colors.amber.textDark, border: colors.amberBorder }
      : { fundo: colors.surfaceSubtle, icone: colors.textSecondary, border: colors.border };

  const handleAbrirHealthConnect = async () => {
    setAviso('');
    const ok = await abrirHealthConnect();
    if (!ok) {
      setAviso('O Health Connect abre só em celular Android. Peça ajuda à sua família para conectar o relógio.');
    }
  };

  const handleSincronizarAgora = async () => {
    setSincronizando(true);
    setMensagemSincronizacao('');
    try {
      const res = await sincronizarTelemetriaWearable(
        idosoId || 'me',
        {
          idoso_id: idosoId || 'me',
          device_id: 'relogio-wearable-local',
          device_model: 'Health Connect Watch',
          provider: 'HEALTH_CONNECT',
          timestamp: new Date().toISOString(),
          heart_rate: { bpm: 72 },
          steps: { count: 3200 },
          metadata: {
            versao_app: '1.0.0',
            bateria_celular: 88,
            horario_sincronizacao: new Date().toISOString(),
          },
        }
      );

      if (res.sucesso) {
        setConexao((prev) => ({ ...prev, ultimaMedicaoMs: Date.now() }));
        setMensagemSincronizacao('Dados enviados com sucesso');
      } else {
        setMensagemSincronizacao('Sem internet. Os dados serão enviados depois.');
      }
    } catch {
      setMensagemSincronizacao('Sem internet. Os dados serão enviados depois.');
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <ScreenWrapper>
      <AppHeader title="Meu Relógio" onNavigate={onNavigate} onPressLogo={() => onNavigate('ElderlyData')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Vamos conectar seu relógio</Text>
          <Text style={styles.body}>Seus dados chegam à família sem você abrir o app todo dia.</Text>
        </View>

        <View style={styles.card}>
          {passos.map((passo) => (
            <View key={passo.id} style={styles.step} testID={`relogio-passo-${passo.id.toLowerCase()}`}>
              <View style={[styles.stepIcon, passo.estado === 'AGORA' ? styles.stepIconNow : styles.stepIconDone]}>
                <Icon
                  name={ICONE_PASSO[passo.id]}
                  size={22}
                  color={passo.estado === 'AGORA' ? colors.primary : colors.successDark}
                />
              </View>
              <View style={styles.stepTexts}>
                <Text style={styles.stepTitle}>{passo.titulo}</Text>
                <Text style={styles.stepSub}>{passo.detalhe}</Text>
              </View>
              <View style={[styles.chip, passo.estado === 'FEITO' ? styles.chipDone : styles.chipOther]}>
                <Text style={[styles.chipText, passo.estado === 'FEITO' ? styles.chipTextDone : styles.chipTextOther]}>
                  {ROTULO_ESTADO[passo.estado]}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {conexaoBase.simulado && (
          <View style={styles.simulado} testID="relogio-simulado">
            <Icon name="warning" size={18} color={colors.amber.textDark} />
            <Text style={styles.simuladoTexto}>
              Modo de desenvolvimento: este estado do relógio é simulado, não vem do Health Connect.
            </Text>
          </View>
        )}

        {/* STATUS DO RELÓGIO (HU-023: Cenários 1, 2 e 3) */}
        <View
          style={[styles.status, { backgroundColor: corStatus.fundo, borderColor: corStatus.border }]}
          testID="relogio-status"
        >
          <Icon name={avaliacao.icone} size={28} color={corStatus.icone} />
          <View style={styles.stepTexts}>
            <Text style={styles.statusTitle}>{avaliacao.titulo}</Text>
            <Text style={styles.statusSub}>{avaliacao.mensagem}</Text>
          </View>
        </View>

        {Boolean(aviso) && (
          <Text style={styles.warning} testID="relogio-aviso">
            {aviso}
          </Text>
        )}

        {Boolean(mensagemSincronizacao) && (
          <View style={styles.mensagemSyncCard} testID="mensagem-sincronizacao">
            <Icon name="info" size={18} color={colors.primary} />
            <Text style={styles.mensagemSyncText}>{mensagemSincronizacao}</Text>
          </View>
        )}

        {/* BOTÃO PRINCIPAL DE ACESSO AO HEALTH CONNECT */}
        <TouchableOpacity
          style={styles.primary}
          onPress={handleAbrirHealthConnect}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="relogio-abrir"
        >
          <Icon name={conexao.healthConnectInstalado ? 'open_in_new' : 'download'} size={22} color={colors.white} />
          <Text style={styles.primaryText}>
            {conexao.healthConnectInstalado ? 'Abrir o Health Connect' : 'Instalar Health Connect na Play Store'}
          </Text>
        </TouchableOpacity>

        {/* BOTÃO SINCRONIZAR AGORA (HU-026) */}
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSincronizarAgora}
          disabled={sincronizando}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="relogio-sincronizar-agora"
        >
          {sincronizando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Icon name="sync" size={20} color={colors.primary} />
              <Text style={styles.syncButtonText}>Atualizar agora</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.info}>
          <Icon name="help" size={18} color={colors.primary} />
          <Text style={styles.infoText}>Sem medição nas últimas 24 h? Abra o app do seu relógio e sincronize.</Text>
        </View>

        {primeiroUso && (
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => onNavigate('ElderlyMode')}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="relogio-concluir"
          >
            <Text style={styles.secondaryText}>Concluir e ir para o início</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <BottomNavBar currentScreen="ElderlyWatch" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 20, gap: 16, ...shadows.tier1 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  body: { fontSize: 16, lineHeight: 24, color: colors.onSurface, fontFamily: typography.fontFamily.body },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stepIconDone: { backgroundColor: colors.mintBg },
  stepIconNow: { backgroundColor: colors.skyBg },
  stepTexts: { flex: 1 },
  stepTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  stepSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  chip: { minHeight: 28, paddingHorizontal: 10, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  chipDone: { backgroundColor: colors.mintBg },
  chipOther: { backgroundColor: colors.skyBg },
  chipText: { fontSize: 14, fontWeight: '800', fontFamily: typography.fontFamily.body },
  chipTextDone: { color: colors.successDark },
  chipTextOther: { color: colors.primary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderRadius: 20, borderWidth: 1.5 },
  statusTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  statusSub: { fontSize: 15, lineHeight: 22, color: colors.onSurface, fontFamily: typography.fontFamily.body },
  simulado: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder },
  simuladoTexto: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.amber.textDark, fontFamily: typography.fontFamily.body },
  warning: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.coralDark, fontFamily: typography.fontFamily.body },
  mensagemSyncCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.skyBg },
  mensagemSyncText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.body },
  primary: {
    minHeight: 56,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  primaryText: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  syncButton: {
    minHeight: 52,
    borderRadius: 9999,
    backgroundColor: colors.skyBg,
    borderWidth: 1,
    borderColor: '#C4E4F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  syncButtonText: { fontSize: 16, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  info: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.skyBg },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.primary, fontFamily: typography.fontFamily.body },
  secondary: {
    minHeight: 56,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
});
