import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import type { StatusRelogioIdoso } from '../services/relogioStatusService';
import { colors, font, rounded, shadows } from '../theme';

export interface WatchStatusCardProps {
  status: StatusRelogioIdoso | null;
  onPress?: () => void;
}

/**
 * Card indicador de status do relógio para a tela do idoso (HU-025 e RNF-006).
 * Indicador grande verde ou laranja com textos e tipografia acessíveis.
 */
export default function WatchStatusCard({ status, onPress }: WatchStatusCardProps) {
  if (!status) return null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: status.corFundo,
          borderColor: status.corBorda,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Status do relógio: ${status.titulo}. ${status.subtitulo}`}
      accessibilityHint="Toque para abrir os detalhes e configurações do relógio"
      testID="watch-status-card"
    >
      <View style={[styles.iconCircle, { backgroundColor: status.cor }]}>
        <Icon name={status.icone} size={26} color={colors.white} />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.badgeRow}>
          <View style={[styles.liveDot, { backgroundColor: status.cor }]} />
          <Text style={[styles.badgeLabel, { color: status.cor }]}>
            {status.funcionando ? 'CONECTADO' : 'ATENÇÃO'}
          </Text>
        </View>

        {/* Texto grande conforme HU-025 e RNF-006 (>= 18sp) */}
        <Text
          style={[
            styles.title,
            { color: status.funcionando ? colors.mint.textDark : colors.amber.textDark },
          ]}
        >
          {status.titulo}
        </Text>
        <Text
          style={[
            styles.subtitle,
            { color: status.funcionando ? colors.mint.text : colors.amber.textDark },
          ]}
        >
          {status.subtitulo}
        </Text>
      </View>

      <Icon
        name="chevron_right"
        size={22}
        color={status.funcionando ? colors.mint.text : colors.amber.textDark}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 74,
    borderRadius: rounded.card,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
    ...shadows.tier1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: rounded.full,
  },
  badgeLabel: {
    fontSize: 14,
    ...font('body', 700),
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    ...font('heading', 700),
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    ...font('body', 400),
    marginTop: 2,
  },
});
