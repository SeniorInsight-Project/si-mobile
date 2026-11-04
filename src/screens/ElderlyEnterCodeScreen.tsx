import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  sanitizarCodigo,
} from '../services/pareamentoService';
import { obterAparelho } from '../services/aparelhoService';

export interface ElderlyEnterCodeScreenProps {
  onNavigate: (screen: string) => void;
  onPareado: (resultado: ResultadoPareamento) => void;
  /** Código vindo do deep link seniorinsight://pareamento?codigo=...: preenche e entra sozinho. */
  codigoInicial?: string | null;
  /** Avisa que o código do link já foi usado (para não reenviar ao voltar para a tela). */
  onCodigoInicialUsado?: () => void;
}

/**
 * Pareamento do idoso por código (HU-007, RN-020; RNF-006: alvos >= 48 dp, texto >= 18 sp).
 * O código é gerado pelo identity-service: 6 letras e números (o contrato aceita de 6 a 8).
 */
export default function ElderlyEnterCodeScreen({
  onNavigate,
  onPareado,
  codigoInicial,
  onCodigoInicialUsado,
}: ElderlyEnterCodeScreenProps) {
  const [codigo, setCodigo] = useState(() => sanitizarCodigo(codigoInicial ?? ''));
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const enviando = useRef(false);

  const alterarCodigo = (valor: string) => {
    setCodigo(valor);
    if (erro) setErro('');
  };

  const entrar = useCallback(
    async (valor: string) => {
      if (enviando.current) return;
      if (!codigoValido(valor)) {
        setErro(MENSAGENS_PAREAMENTO.CODIGO_INCOMPLETO);
        return;
      }
      enviando.current = true;
      setCarregando(true);
      setErro('');
      try {
        const resultado = await parearComCodigo(valor, await obterAparelho());
        onPareado(resultado);
        onNavigate('ElderlyConnected');
      } catch (e) {
        setErro(e instanceof PareamentoError ? e.message : MENSAGENS_PAREAMENTO.FALHA);
      } finally {
        enviando.current = false;
        setCarregando(false);
      }
    },
    [onNavigate, onPareado],
  );

  // Link aberto pela câmera do sistema: entra sem precisar digitar.
  useEffect(() => {
    if (!codigoInicial) return;
    const valor = sanitizarCodigo(codigoInicial);
    onCodigoInicialUsado?.();
    setCodigo(valor);
    entrar(valor);
  }, [codigoInicial]);

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
            <Icon name="arrow_back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.topTitle} accessibilityRole="header">
            Entrar com código
          </Text>
        </View>

        <Text style={styles.title}>Digite o código</Text>
        <Text style={styles.subtitle}>
          Ele aparece no celular do seu familiar, embaixo do QR Code. São 6 letras e números.
        </Text>

        <PairingCodeInput
          value={codigo}
          onChange={alterarCodigo}
          hasError={Boolean(erro)}
          autoFocus={!codigoInicial}
          onSubmit={() => entrar(codigo)}
        />

        {Boolean(erro) && (
          <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="assertive" testID="codigo-erro">
            <Icon name="error" size={24} color={colors.coralDark} />
            <Text style={styles.errorText}>{erro}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.enterButton, carregando && styles.enterButtonDisabled]}
          onPress={() => entrar(codigo)}
          disabled={carregando}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={carregando ? 'Conectando' : 'Entrar com o código'}
          accessibilityState={{ disabled: carregando, busy: carregando }}
          testID="codigo-entrar"
        >
          {carregando ? (
            <>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.enterButtonText}>Conectando...</Text>
            </>
          ) : (
            <>
              <Icon name="login" size={24} color={colors.white} />
              <Text style={styles.enterButtonText}>Entrar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => onNavigate('ElderlyQrScan')}
          disabled={carregando}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Ler QR Code com a câmera"
          testID="codigo-ler-qr"
        >
          <Icon name="qr_code_scanner" size={24} color={colors.primary} />
          <Text style={styles.qrButtonText}>Ler QR Code</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>O código vale por pouco tempo e só pode ser usado uma vez.</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 20, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  title: {
    marginTop: 12,
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 18,
    lineHeight: 26,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  errorBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.peachBg,
  },
  errorText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
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
  enterButtonText: { fontSize: 20, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  qrButton: {
    marginTop: 12,
    minHeight: 64,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  qrButtonText: { fontSize: 20, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  footnote: {
    marginTop: 20,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
});
