import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import PairingCodeInput from '../components/PairingCodeInput';
import Icon from '../components/Icon';
import { colors, typography } from '../theme';
import {
  MENSAGENS_PAREAMENTO,
  PareamentoError,
  ResultadoPareamento,
  codigoValido,
  parearComCodigo,
} from '../services/pareamentoService';
import { obterAparelho } from '../services/aparelhoService';

export interface ElderlyEnterCodeScreenProps {
  onNavigate: (screen: string) => void;
  onPareado: (resultado: ResultadoPareamento) => void;
}

/** Figma: "Idoso - Digitar Código" (HU-007, RN-020). */
export default function ElderlyEnterCodeScreen({ onNavigate, onPareado }: ElderlyEnterCodeScreenProps) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const alterarCodigo = (valor: string) => {
    setCodigo(valor);
    if (erro) setErro('');
  };

  const entrar = async () => {
    if (carregando) return;
    if (!codigoValido(codigo)) {
      setErro(MENSAGENS_PAREAMENTO.CODIGO_INCOMPLETO);
      return;
    }
    try {
      setCarregando(true);
      const resultado = await parearComCodigo(codigo, await obterAparelho());
      onPareado(resultado);
      onNavigate('ElderlyConnected');
    } catch (e) {
      setErro(e instanceof PareamentoError ? e.message : 'Não foi possível conectar agora. Tente de novo.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ScreenWrapper hasHeader={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onNavigate('EntryApp')}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            testID="codigo-voltar"
          >
            <Icon name="arrow_back" size={26} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Digitar o código</Text>
        </View>

        <Text style={styles.title}>Digite o código</Text>
        <Text style={styles.subtitle}>Ele aparece no celular do seu familiar, embaixo do QR Code. São letras e números.</Text>

        <PairingCodeInput value={codigo} onChange={alterarCodigo} hasError={Boolean(erro)} autoFocus onSubmit={entrar} />

        {Boolean(erro) && (
          <View style={styles.errorBox} accessibilityRole="alert" testID="codigo-erro">
            <Icon name="error" size={22} color={colors.coralDark} />
            <Text style={styles.errorText}>{erro}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.enterButton, carregando && styles.enterButtonDisabled]}
          onPress={entrar}
          disabled={carregando}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="codigo-entrar"
        >
          {carregando ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Icon name="login" size={22} color={colors.white} />
              <Text style={styles.enterButtonText}>Entrar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => onNavigate('ElderlyQrScan')}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="codigo-voltar-qr"
        >
          <Icon name="qr_code_scanner" size={22} color={colors.primary} />
          <Text style={styles.qrButtonText}>Voltar para o QR Code</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>O código vale por pouco tempo e só pode ser usado uma vez.</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  errorBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.peachBg,
  },
  errorText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.coralDark,
    fontFamily: typography.fontFamily.body,
  },
  enterButton: {
    marginTop: 20,
    minHeight: 64,
    borderRadius: 9999,
    backgroundColor: colors.successDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  enterButtonDisabled: { opacity: 0.7 },
  enterButtonText: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  qrButton: {
    marginTop: 12,
    minHeight: 64,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  qrButtonText: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  footnote: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
});
