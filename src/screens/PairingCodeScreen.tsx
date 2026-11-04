import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Share, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import { colors, typography, shadows } from '../theme';
import {
  PareamentoError,
  formatarCodigoExibicao,
  gerarCodigoPareamento,
  montarMensagemCompartilhamento,
  saudacaoIdoso,
} from '../services/pareamentoService';

export interface PairingCodeScreenProps {
  onNavigate: (screen: string) => void;
  idosoId: string;
  nomeIdoso: string;
}

/**
 * Figma: "Código de Pareamento" — passo 2 de 2 (HU-008 cenário 1, RF-006, RN-020).
 * O código e o QR vêm do servidor (contrato identity-v1); o app não gera nem guarda código.
 */
export default function PairingCodeScreen({ onNavigate, idosoId, nomeIdoso }: PairingCodeScreenProps) {
  const [codigo, setCodigo] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [expiraEm, setExpiraEm] = useState<number | null>(null);
  const [gerando, setGerando] = useState(true);
  const [erro, setErro] = useState('');

  const gerar = useCallback(async () => {
    try {
      setGerando(true);
      setErro('');
      const gerado = await gerarCodigoPareamento({ nomeIdoso, idosoId });
      setCodigo(gerado.codigo);
      setQrValue(gerado.qrCodeConteudo);
      setExpiraEm(gerado.expiraEm);
    } catch (e) {
      // sem código de exemplo: se o servidor não respondeu, a tela mostra o erro
      setCodigo('');
      setQrValue('');
      setExpiraEm(null);
      setErro(e instanceof PareamentoError ? e.message : 'Não foi possível gerar o código agora. Tente de novo.');
    } finally {
      setGerando(false);
    }
  }, [idosoId, nomeIdoso]);

  useEffect(() => {
    gerar();
  }, [gerar]);

  const compartilhar = async () => {
    if (!codigo) return;
    try {
      await Share.share({ message: montarMensagemCompartilhamento(codigo, expiraEm ?? undefined) });
    } catch {
      setErro('Não foi possível abrir o compartilhamento.');
    }
  };

  const tratamento = saudacaoIdoso(nomeIdoso) || 'o idoso';

  return (
    <ScreenWrapper>
      <AppHeader title="Código de Pareamento" onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.stepChip}>
            <Icon name="link" size={14} color={colors.primary} />
            <Text style={styles.stepText}>PASSO 2 DE 2</Text>
          </View>
          <Text style={styles.title}>Conecte o celular de {tratamento}</Text>
          <Text style={styles.subtitle}>
            No celular do idoso, abra o SeniorInsight e toque em "Entrar com QR Code". Se preferir, é possível digitar o código.
          </Text>

          <View style={styles.qrBox} testID="pareamento-qr">
            {gerando || !qrValue ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <QRCode value={qrValue} size={170} color={colors.primary} backgroundColor="transparent" />
            )}
          </View>

          <Text style={styles.code} testID="pareamento-codigo" accessibilityLabel={`Código ${codigo.split('').join(' ')}`}>
            {codigo ? formatarCodigoExibicao(codigo) : '— — —'}
          </Text>

          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: colors.mintBg }]}>
              <Icon name="check_circle" size={14} color={colors.successDark} />
              <Text style={[styles.chipText, { color: colors.successDark }]}>USO ÚNICO</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: colors.skyBg }]}>
              <Icon name="schedule" size={14} color={colors.primary} />
              <Text style={[styles.chipText, { color: colors.primary }]} testID="pareamento-validade">
                {expiraEm
                  ? `VALE ATÉ ${new Date(expiraEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'VALE POUCO TEMPO'}
              </Text>
            </View>
          </View>
        </View>

        {Boolean(erro) && (
          <Text style={styles.error} accessibilityRole="alert" testID="pareamento-erro">
            {erro}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.primary, !codigo && styles.disabled]}
          onPress={compartilhar}
          disabled={!codigo}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="pareamento-compartilhar"
        >
          <Icon name="share" size={22} color={colors.white} />
          <Text style={styles.primaryText}>Compartilhar código</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondary, gerando && styles.disabled]}
          onPress={gerar}
          disabled={gerando}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="pareamento-gerar-novo"
        >
          <Icon name="refresh" size={22} color={colors.primary} />
          <Text style={styles.secondaryText}>Gerar novo código</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 110, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 20, gap: 12, ...shadows.tier1 },
  stepChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: colors.skyBg,
  },
  stepText: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.body },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  qrBox: {
    minHeight: 232,
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: {
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
  },
  chipsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  chipText: { fontSize: 14, fontWeight: '700', fontFamily: typography.fontFamily.body },
  error: { fontSize: 14, color: colors.coralDark, fontWeight: '600', fontFamily: typography.fontFamily.body },
  primary: {
    minHeight: 56,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  secondary: {
    minHeight: 56,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryText: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  disabled: { opacity: 0.6 },
});
