import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import { colors, shadows, typography } from '../theme';
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onNavigate('EntryApp')}
            accessibilityRole="button"
            accessibilityLabel="Voltar para a tela anterior"
          >
            <Icon name="arrow_back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.safeBadge}>
            <Icon name="shield" size={14} color={colors.primaryNavyDeep} />
            <Text style={styles.safeBadgeText}>Ambiente Seguro</Text>
          </View>
        </View>

        <View style={styles.iconCircle}>
          <Icon name="mail" size={40} color={colors.secondaryCoral} />
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
            <Icon name="info" size={18} color={colors.amberText} />
            <Text style={styles.warningText}>
              Seu e-mail ainda não foi confirmado. Toque no link que enviamos e tente de novo.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, ocupado && styles.primaryButtonDisabled]}
          onPress={handleJaConfirmei}
          disabled={ocupado}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="confirmar-email-ja-confirmei"
        >
          {ocupado ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Já confirmei</Text>
              <Icon name="arrow_forward" size={20} color={colors.white} />
            </>
          )}
        </TouchableOpacity>

        {erro ? <Text style={styles.errorText}>{erro}</Text> : null}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => onNavigate('EntryApp')}
          accessibilityRole="button"
        >
          <Icon name="arrow_back" size={18} color={colors.primaryNavyDeep} />
          <Text style={styles.linkText}>Voltar ao início</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.tier2,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: colors.skyBg,
  },
  safeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryNavyDeep,
    fontFamily: typography.fontFamily.heading,
  },
  iconCircle: {
    alignSelf: 'center',
    marginTop: 24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.tier3,
  },
  title: {
    marginTop: 24,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  infoCard: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.mintBg,
    ...shadows.tier1,
  },
  infoCheck: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTexts: { flex: 1 },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.successDark,
    fontFamily: typography.fontFamily.heading,
  },
  infoText: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  warningCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.amber.textDark,
    fontFamily: typography.fontFamily.body,
  },
  primaryButton: {
    marginTop: 24,
    minHeight: 56,
    borderRadius: 9999,
    backgroundColor: colors.primaryNavyDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.tier2,
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    fontFamily: typography.fontFamily.heading,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.secondary,
    fontFamily: typography.fontFamily.body,
  },
  linkButton: {
    marginTop: 16,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryNavyDeep,
    fontFamily: typography.fontFamily.heading,
  },
});
