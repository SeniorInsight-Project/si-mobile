import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, font, rounded, sizes } from '../theme';

/**
 * Chip de seleção único (ex.: Janela de Tolerância 10/15/30 min, Sexo).
 * Altura mínima 48 dp, raio rounded.full; selecionado em colors.primary/branco.
 */
export interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export default function ChoiceChip({
  label,
  selected,
  onPress,
  disabled = false,
  accessibilityLabel,
}: ChoiceChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
    >
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    minHeight: sizes.touchMin,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('heading', 600),
  },
  labelSelected: {
    color: colors.white,
    ...font('body', 700),
  },
});
