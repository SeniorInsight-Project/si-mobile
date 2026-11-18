import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import Button from './Button';
import { colors, font, rounded, shadows } from '../theme';

export interface RescueCommandCardProps {
  onAssumirResgate?: () => void;
  onVerContatos?: () => void;
  resgateAtivo?: boolean;
  responsavelNome?: string;
}

export default function RescueCommandCard({
  onAssumirResgate,
  onVerContatos,
  resgateAtivo = false,
  responsavelNome = '',
}: RescueCommandCardProps) {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View style={styles.shieldIconWrapper}>
          <Icon name="shield_alert" size={18} color={colors.coralDark} />
        </View>
        <Text style={styles.cardTitle}>Comando de Resgate Familiar</Text>
      </View>

      <Text style={styles.cardDescription}>
        Em caso de alarme ou perda de contato, assuma o protocolo para notificar
        todos os familiares e os serviços médicos de emergência.
      </Text>

      <View style={styles.rescueWrapper}>
        <Button
          title={resgateAtivo ? 'Resgate em Andamento' : 'Estou Assumindo o Resgate'}
          onPress={onAssumirResgate || (() => {})}
          variant={resgateAtivo ? 'sos' : 'primary'}
          size="xl"
          iconLeft="emergency"
          iconRight="chevron_right"
        />
        <Text style={styles.rescueSubtitle}>
          {resgateAtivo
            ? `Assumido por ${responsavelNome || 'você'} • Protocolo Ativo`
            : 'Dispara alerta prioritário no celular do idoso'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.presencePillRow}
        onPress={onVerContatos}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Ver contatos de emergência"
      >
        <Text style={styles.redeAtentaLabel}>Ver contatos de emergência</Text>
        <Icon name="chevron_right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 20,
    marginBottom: 20,
    ...shadows.tier2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  shieldIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: colors.peach.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  cardDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    ...font('body', 500),
  },
  rescueWrapper: {
    gap: 8,
    marginBottom: 16,
  },
  rescueSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    ...font('body', 500),
  },
  presencePillRow: {
    minHeight: 48,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  redeAtentaLabel: {
    flexShrink: 1,
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
});
