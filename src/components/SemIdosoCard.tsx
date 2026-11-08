import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors, typography, shadows } from '../theme';

export interface SemIdosoCardProps {
  onNavigate?: (screen: string) => void;
  mensagem?: string;
}

/**
 * Exibido quando nenhum idoso está selecionado ou cadastrado (Issue #82).
 * Mensagem canônica: "Cadastre ou peça acesso a um idoso".
 */
export default function SemIdosoCard({
  onNavigate,
  mensagem = 'Cadastre ou peça acesso a um idoso para visualizar os dados de saúde e acompanhamento.',
}: SemIdosoCardProps) {
  return (
    <View style={styles.card} testID="sem-idoso-card">
      <View style={styles.iconCircle}>
        <Icon name="person_add" size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>Nenhum idoso selecionado</Text>
      <Text style={styles.message}>{mensagem}</Text>

      {onNavigate && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onNavigate('RegisterElderly')}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="btn-cadastrar-idoso-vazio"
          >
            <Icon name="person_add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Cadastrar idoso</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onNavigate('Home')}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Ir para o início</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.skyBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyDisplay,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyBody,
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.fontFamilyBody,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.fontFamilyBody,
  },
});
