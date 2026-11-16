import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, typography, shadows, font, rounded } from '../theme';
import { useIdoso } from '../context/IdosoContext';
import { CONSENTIMENTO_PADRAO, Consentimentos, obterConsentimentos } from '../services/consentimentoService';
import {
  EstadoPasso,
  classificarSincronizacao,
  montarPassos,
  obterEstadoConexao,
} from '../services/relogioService';
import { abrirHealthConnect } from '../services/healthConnectLauncher';

export interface ElderlyWatchScreenProps {
  onNavigate: (screen: string) => void;
  primeiroUso?: boolean;
}

const ICONE_PASSO: Record<string, string> = { INSTALAR: 'download', PERMITIR: 'watch', SEGUNDO_PLANO: 'sync' };
const ROTULO_ESTADO: Record<EstadoPasso, string> = { FEITO: 'FEITO', AGORA: 'AGORA', PENDENTE: 'DEPOIS' };

/** Figma: "Idoso - Conectar Relógio" (HU-023, HU-025). Só o idoso chega aqui. */
export default function ElderlyWatchScreen({ onNavigate, primeiroUso = false }: ElderlyWatchScreenProps) {
  const [consentimentos, setConsentimentos] = useState<Consentimentos>(CONSENTIMENTO_PADRAO);
  const [aviso, setAviso] = useState('');
  const { idosoId } = useIdoso();
  const conexao = useMemo(() => obterEstadoConexao(), []);

  useEffect(() => {
    // Se não carregar (ou sem idosoId), o passo 2 mostra "nenhum dado autorizado"; a tela Meus Dados é quem mostra o erro.
    obterConsentimentos(idosoId).then(setConsentimentos).catch(() => undefined);
  }, [idosoId]);

  const passos = montarPassos(conexao, consentimentos);
  const status = classificarSincronizacao(conexao.ultimaMedicaoMs);
  const corStatus =
    status.cor === 'verde'
      ? { fundo: colors.mintBg, icone: colors.successDark, icon: 'check_circle' }
      : status.cor === 'laranja'
        ? { fundo: colors.amberBg, icone: colors.amber.text, icon: 'warning' }
        : { fundo: colors.surfaceSubtle, icone: colors.textSecondary, icon: 'info' };

  const abrir = async () => {
    const ok = await abrirHealthConnect();
    setAviso(
      ok
        ? ''
        : 'O Health Connect abre só em celular Android. Peça ajuda à sua família para conectar o relógio.'
    );
  };

  return (
    <ScreenWrapper>
      <AppHeader title="Meu relógio" onNavigate={onNavigate} onPressLogo={() => onNavigate('ElderlyData')} />
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

        {conexao.simulado && (
          <View style={styles.simulado} testID="relogio-simulado">
            <Icon name="warning" size={18} color={colors.amber.textDark} />
            <Text style={styles.simuladoTexto}>
              Modo de desenvolvimento: este estado do relógio é simulado, não vem do Health Connect.
            </Text>
          </View>
        )}

        <View style={[styles.status, { backgroundColor: corStatus.fundo }]} testID="relogio-status">
          <Icon name={corStatus.icon} size={24} color={corStatus.icone} />
          <View style={styles.stepTexts}>
            <Text style={styles.stepTitle}>{status.titulo}</Text>
            <Text style={styles.stepSub}>{status.detalhe}</Text>
          </View>
        </View>

        {Boolean(aviso) && (
          <Text style={styles.warning} testID="relogio-aviso">
            {aviso}
          </Text>
        )}

        <Button
          title="Abrir o Health Connect"
          iconLeft="open_in_new"
          variant="primary"
          size="lg"
          onPress={abrir}
          testID="relogio-abrir"
        />

        <View style={styles.info}>
          <Icon name="help" size={18} color={colors.primary} />
          <Text style={styles.infoText}>Sem medição nas últimas 24 h? Abra o app do seu relógio e sincronize.</Text>
        </View>

        {primeiroUso && (
          <Button
            title="Concluir e ir para o início"
            variant="success"
            size="xl"
            onPress={() => onNavigate('ElderlyMode')}
            testID="relogio-concluir"
          />
        )}
      </ScrollView>
      <BottomNavBar currentScreen="ElderlyWatch" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: rounded.xl, padding: 20, gap: 16, ...shadows.tier1 },
  title: { fontSize: 24, lineHeight: 30,  color: colors.primary, ...font('heading', 800) },
  body: { fontSize: 16, lineHeight: 24, color: colors.textPrimary, ...font('body', 400) },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 48, height: 48, borderRadius: rounded.full, alignItems: 'center', justifyContent: 'center' },
  stepIconDone: { backgroundColor: colors.mintBg },
  stepIconNow: { backgroundColor: colors.skyBg },
  stepTexts: { flex: 1 },
  stepTitle: { fontSize: 16, lineHeight: 22,  color: colors.primary, ...font('heading', 700) },
  stepSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, ...font('body', 400) },
  chip: { minHeight: 28, paddingHorizontal: 10, borderRadius: rounded.full, alignItems: 'center', justifyContent: 'center' },
  chipDone: { backgroundColor: colors.mintBg },
  chipOther: { backgroundColor: colors.skyBg },
  chipText: { fontSize: 14,  ...font('body', 700) },
  chipTextDone: { color: colors.successDark },
  chipTextOther: { color: colors.primary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderRadius: rounded.xl },
  simulado: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: rounded.lg, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder },
  simuladoTexto: { flex: 1, fontSize: 14, lineHeight: 20,  color: colors.amber.textDark, ...font('body', 600) },
  warning: { fontSize: 14, lineHeight: 20,  color: colors.coralDark, ...font('body', 600) },
  primary: {
    minHeight: 64,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: { fontSize: 18,  color: colors.white, ...font('heading', 700) },
  info: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: rounded.lg, backgroundColor: colors.skyBg },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.primary, ...font('body', 400) },
  secondary: {
    minHeight: 56,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 18,  color: colors.primary, ...font('heading', 700) },
});
