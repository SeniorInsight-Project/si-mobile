import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View, Text, ActivityIndicator, Share, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from './Icon';
import Button from './Button';
import { colors, typography, shadows, font, rounded } from '../theme';
import { idosoIdDoServidor } from '../services/elderlyService';
import {
  MENSAGENS_PAREAMENTO,
  PareamentoError,
  formatarCodigoExibicao,
  gerarCodigoPareamento,
  montarMensagemCompartilhamento,
  validadeDoCodigo,
  type CodigoGerado,
} from '../services/pareamentoService';

export interface CodigoPareamentoPainelProps {
  idosoId: string | null;
  nomeIdoso: string;
  /** Gera o código ao abrir (depois do cadastro). No perfil, o familiar pede pelo botão. */
  gerarAoAbrir?: boolean;
  mostrarCompartilhar?: boolean;
  /** Conteúdo no topo do cartão do código (ex.: "Passo 2 de 2" e título). */
  cabecalho?: ReactNode;
}

/**
 * Código e QR de pareamento gerados pelo identity-service (HU-008, RF-006, RN-020):
 * POST /api/v1/identity/pareamentos/codigos. O app não gera nem guarda código; em erro mostra a mensagem
 * e "Tentar de novo". "Gerar novo código" chama a mesma rota e o servidor invalida o anterior.
 */
export default function CodigoPareamentoPainel({
  idosoId,
  nomeIdoso,
  gerarAoAbrir = true,
  mostrarCompartilhar = true,
  cabecalho,
}: CodigoPareamentoPainelProps) {
  const [gerado, setGerado] = useState<CodigoGerado | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [agora, setAgora] = useState(() => Date.now());
  const montado = useRef(true);

  useEffect(
    () => () => {
      montado.current = false;
    },
    [],
  );

  const gerar = useCallback(async () => {
    if (!nomeIdoso.trim()) {
      setErro('Cadastre o nome do idoso antes de gerar o código.');
      return;
    }
    setGerando(true);
    setErro('');
    setGerado(null);
    try {
      const novo = await gerarCodigoPareamento({ nomeIdoso: nomeIdoso.trim(), idosoId: idosoIdDoServidor(idosoId) });
      if (!montado.current) return;
      setGerado(novo);
      setAgora(Date.now());
    } catch (e) {
      if (!montado.current) return;
      setErro(e instanceof PareamentoError ? e.message : MENSAGENS_PAREAMENTO.FALHA);
    } finally {
      if (montado.current) setGerando(false);
    }
  }, [idosoId, nomeIdoso]);

  useEffect(() => {
    // só ao abrir ou ao trocar de idoso: cada geração invalida o código anterior no servidor
    if (gerarAoAbrir) gerar();
  }, [gerarAoAbrir, idosoId]);

  const validade = gerado ? validadeDoCodigo(gerado.expiraEm, agora) : null;

  // contagem regressiva até o código vencer
  useEffect(() => {
    if (!gerado || validade?.vencido) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [gerado, validade?.vencido]);

  const compartilhar = async () => {
    if (!gerado || validade?.vencido) return;
    try {
      await Share.share({ message: montarMensagemCompartilhamento(gerado.codigo, gerado.expiraEm) });
    } catch {
      setErro('Não foi possível abrir o compartilhamento.');
    }
  };

  const valido = Boolean(gerado && validade && !validade.vencido);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        {cabecalho}
        <View style={styles.qrBox} testID="pareamento-qr">
          {gerando ? (
            <ActivityIndicator color={colors.primary} accessibilityLabel="Gerando o código" />
          ) : valido && gerado ? (
            <View accessible accessibilityRole="image" accessibilityLabel="QR Code de pareamento">
              <QRCode value={gerado.qrCodeConteudo} size={170} color={colors.primary} backgroundColor="transparent" />
            </View>
          ) : (
            <View style={styles.vazio}>
              <Icon
                name={erro ? 'error' : 'qr_code_scanner'}
                size={40}
                color={erro ? colors.coralDark : colors.textSecondary}
              />
              <Text style={styles.vazioText}>
                {erro
                  ? 'Sem código agora'
                  : gerado
                    ? 'Este código venceu. Gere um novo.'
                    : 'Gere o código para conectar o celular do idoso.'}
              </Text>
            </View>
          )}
        </View>

        {valido && gerado && validade ? (
          <>
            <Text
              style={styles.code}
              testID="pareamento-codigo"
              accessibilityLabel={`Código ${gerado.codigo.split('').join(' ')}`}
            >
              {formatarCodigoExibicao(gerado.codigo)}
            </Text>
            <View style={styles.chipsRow}>
              <View style={[styles.chip, { backgroundColor: colors.mintBg }]}>
                <Icon name="check_circle" size={14} color={colors.successDark} />
                <Text style={[styles.chipText, { color: colors.successDark }]}>USO ÚNICO</Text>
              </View>
              <View
                style={[styles.chip, { backgroundColor: colors.skyBg }]}
                accessibilityLiveRegion={validade.segundos <= 60 ? 'polite' : 'none'}
              >
                <Icon name="schedule" size={14} color={colors.primary} />
                <Text style={[styles.chipText, { color: colors.primary }]} testID="pareamento-validade">
                  {validade.texto.toUpperCase()}
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </View>

      {Boolean(erro) && (
        <View style={styles.errorBox} accessibilityRole="alert" testID="pareamento-erro">
          <Text style={styles.errorText}>{erro}</Text>
          <Button
            title="Tentar de novo"
            iconLeft="refresh"
            variant="secondary"
            fullWidth={false}
            disabled={gerando}
            onPress={gerar}
            accessibilityLabel="Tentar de novo gerar o código"
            testID="pareamento-tentar-de-novo"
          />
        </View>
      )}

      {mostrarCompartilhar && (
        <Button
          title="Compartilhar código"
          iconLeft="share"
          variant="primary"
          size="lg"
          disabled={!valido}
          onPress={compartilhar}
          accessibilityLabel="Compartilhar código"
          testID="pareamento-compartilhar"
        />
      )}

      {!erro && (
        <Button
          title={gerando ? 'Gerando...' : gerado ? 'Gerar novo código' : 'Gerar código'}
          iconLeft="refresh"
          variant="secondary"
          size="lg"
          loading={gerando}
          disabled={gerando}
          onPress={gerar}
          accessibilityLabel={gerado ? 'Gerar novo código' : 'Gerar código'}
          testID="pareamento-gerar-novo"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: rounded.xl, padding: 20, gap: 12, ...shadows.tier1 },
  qrBox: {
    minHeight: 232,
    borderRadius: rounded.xl,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  vazio: { alignItems: 'center', gap: 8 },
  vazioText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
    ...font('body', 400),
  },
  code: {
    textAlign: 'center',
    fontSize: 40,
    letterSpacing: 2,
    color: colors.primary,
    ...font('heading', 800),
  },
  chipsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28, // estilo-ok: badge informativo, não é alvo de toque
    paddingHorizontal: 12,
    borderRadius: rounded.full,
  },
  chipText: { fontSize: 14,  ...font('body', 700) },
  errorBox: { gap: 10, padding: 14, borderRadius: rounded.lg, backgroundColor: colors.peachBg },
  errorText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.coralDark,
    ...font('body', 700),
  },
  retry: {
    minHeight: 48,
    borderRadius: rounded.full,
    backgroundColor: colors.coralDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryText: { fontSize: 16,  color: colors.white, ...font('heading', 700) },
  primary: {
    minHeight: 56,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: { fontSize: 18,  color: colors.white, ...font('heading', 700) },
  secondary: {
    minHeight: 56,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryText: { fontSize: 18,  color: colors.primary, ...font('heading', 700) },
  disabled: { opacity: 0.6 },
});
