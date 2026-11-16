import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import { colors, font, rounded, shadows, typography } from '../theme';
import { useAutenticacaoKeycloak, type DesfechoAutenticacao } from '../services/authService';

export interface ConfirmarEmailScreenProps {
  onNavigate: (screen: string) => void;
  /** Resultado do novo login depois de "Já confirmei". */
  onDesfecho: (desfecho: DesfechoAutenticacao) => void;
}

/**
 * HU-001: a conta foi criada no Keycloak, mas o e-mail ainda não foi confirmado.
 * Visual baseado no estado "Verifique sua caixa de entrada!" da Recuperação de Senha no Figma.
 */
export default function ConfirmarEmailScreen({ onNavigate, onDesfecho }: ConfirmarEmailScreenProps) {
  const { pronto, carregando, erro, entrar } = useAutenticacaoKeycloak();
  const [aindaNaoConfirmado, setAindaNaoConfirmado] = useState(false);

  const handleJaConfirmei = async () => {
    setAindaNaoConfirmado(false);
    const desfecho = await entrar();
    if (desfecho === 'confirmar-email') {
      setAindaNaoConfirmado(true);
      return;
    }
    onDesfecho(desfecho);
  };

  const ocupado = !pronto || carregando;

  return (
    <ScreenWrapper hasHeader={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <IconButton
            icon="arrow_back"
            variant="neutral"
            accessibilityLabel="Voltar para a tela anterior"
            onPress={() => onNavigate('EntryApp')}
          />
          <View style={styles.safeBadge}>
            <Icon name="shield" size={16} color={colors.primaryNavyDeep} />
            <Text style={styles.safeBadgeText}>Ambiente Seguro</Text>
          </View>
        </View>

        <View style={styles.iconCircle}>
          <Icon name="mail" size={40} color={colors.coral} />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Confirme seu e-mail para continuar
        </Text>
        <Text style={styles.subtitle}>
          Enviamos um link de confirmação para o e-mail que você cadastrou. Toque no link para ativar sua conta.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoCheck}>
            <Icon name="check" size={20} color={colors.white} />
          </View>
          <View style={styles.infoTexts}>
            <Text style={styles.infoTitle}>Verifique sua caixa de entrada!</Text>
            <Text style={styles.infoText}>
              O link vale por 24 horas. Se não encontrar, olhe também no spam ou lixo eletrônico.
            </Text>
          </View>
        </View>

        {aindaNaoConfirmado ? (
          <View style={styles.warningCard} testID="confirmar-email-pendente">
            <Icon name="info" size={18} color={colors.amber.text} />
            <Text style={styles.warningText}>
              Seu e-mail ainda não foi confirmado. Toque no link que enviamos e tente de novo.
            </Text>
          </View>
        ) : null}

        <View style={styles.primaryWrapper}>
          <Button
            title="Já confirmei"
            onPress={handleJaConfirmei}
            variant="primary"
            size="lg"
            iconRight="arrow_forward"
            loading={ocupado}
            disabled={ocupado}
            testID="confirmar-email-ja-confirmei"
          />
        </View>

        {erro ? <Text style={styles.errorText}>{erro}</Text> : null}

        <View style={styles.linkWrapper}>
          <Button
            title="Voltar ao início"
            onPress={() => onNavigate('EntryApp')}
            variant="ghost"
            iconLeft="arrow_back"
            fullWidth={false}
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.full,
    backgroundColor: colors.sky.background,
  },
  safeBadgeText: {
    fontSize: 14,
    color: colors.primaryNavyDeep,
    ...font('heading', 700),
  },
  iconCircle: {
    alignSelf: 'center',
    marginTop: 24,
    width: 96,
    height: 96,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.tier3,
  },
  title: {
    marginTop: 24,
    ...typography.headlineLg,
    textAlign: 'center',
    color: colors.primary,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    color: colors.textSecondary,
    ...font('body', 400),
  },
  infoCard: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: rounded.xl,
    backgroundColor: colors.mint.background,
    ...shadows.tier1,
  },
  infoCheck: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTexts: { flex: 1 },
  infoTitle: {
    fontSize: 17,
    color: colors.successDark,
    ...font('heading', 700),
  },
  infoText: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    ...font('body', 400),
  },
  warningCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: rounded.lg,
    backgroundColor: colors.amber.background,
    borderWidth: 1,
    borderColor: colors.amber.border,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.amber.textDark,
    ...font('body', 400),
  },
  primaryWrapper: {
    marginTop: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    color: colors.error,
    ...font('body', 600),
  },
  linkWrapper: {
    marginTop: 16,
    alignItems: 'center',
  },
});
