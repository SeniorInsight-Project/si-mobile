import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import PairingCodeInput from '../components/PairingCodeInput';
import Icon from '../components/Icon';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import { colors, typography, font, rounded } from '../theme';
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
          <IconButton
            icon="arrow_back"
            variant="ghost"
            accessibilityLabel="Voltar"
            onPress={() => onNavigate('EntryApp')}
            testID="codigo-voltar"
          />
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

        <View style={styles.actionsWrapper}>
          <Button
            title={carregando ? 'Conectando...' : 'Entrar'}
            iconLeft="login"
            variant="success"
            size="xl"
            loading={carregando}
            disabled={carregando}
            onPress={() => entrar(codigo)}
            accessibilityLabel={carregando ? 'Conectando' : 'Entrar com o código'}
            testID="codigo-entrar"
          />

          <Button
            title="Ler QR Code"
            iconLeft="qr_code_scanner"
            variant="outline"
            size="lg"
            disabled={carregando}
            onPress={() => onNavigate('ElderlyQrScan')}
            accessibilityLabel="Ler QR Code com a câmera"
            testID="codigo-ler-qr"
          />
        </View>

        <Text style={styles.footnote}>O código vale por pouco tempo e só pode ser usado uma vez.</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 20,  color: colors.primary, ...font('heading', 700) },
  title: {
    marginTop: 12,
    fontSize: 30,
    color: colors.primary,
    ...font('heading', 800),
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 18,
    lineHeight: 26,
    color: colors.textSecondary,
    ...font('body', 400),
  },
  errorBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: rounded.lg,
    backgroundColor: colors.peachBg,
  },
  errorText: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    color: colors.coralDark,
    ...font('body', 700),
  },
  enterButton: {
    marginTop: 20,
    minHeight: 64,
    borderRadius: rounded.full,
    backgroundColor: colors.successDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionsWrapper: {
    marginTop: 24,
    gap: 12,
  },
  footnote: {
    marginTop: 20,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    color: colors.textSecondary,
    ...font('body', 400),
  },
});
