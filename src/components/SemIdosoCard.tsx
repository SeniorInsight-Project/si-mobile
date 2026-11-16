import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import Button from './Button';
import { colors, font, rounded, shadows } from '../theme';

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
          <Button
            title="Cadastrar idoso"
            onPress={() => onNavigate('RegisterElderly')}
            variant="primary"
            iconLeft="person_add"
            testID="btn-cadastrar-idoso-vazio"
          />

          <Button
            title="Ir para o início"
            onPress={() => onNavigate('Home')}
            variant="ghost"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.tier1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: rounded.full,
    backgroundColor: colors.sky.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    color: colors.textPrimary,
    ...font('heading', 700),
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    ...font('body', 400),
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
});
