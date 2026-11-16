import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from './Icon';
import { colors, rounded, sizes } from '../theme';

/**
 * Botão somente ícone com alvo de toque mínimo visível de 48×48 dp (§2.7 do plano):
 * - neutral: fundo surfaceSubtle e ícone primary (fechar modal, editar, compartilhar, mapa).
 * - primary: fundo primary e ícone branco (ação principal compacta).
 * - danger: fundo error e ícone branco (cancelar/excluir item em listas).
 * - ghost: sem fundo e ícone primary (voltar, navegação no cabeçalho).
 */
export type IconButtonVariant = 'neutral' | 'primary' | 'danger' | 'ghost';

export interface IconButtonProps {
  icon: string;
  onPress: () => void;
  variant?: IconButtonVariant;
  accessibilityLabel: string;
  disabled?: boolean;
  iconSize?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLES: Record<
  IconButtonVariant,
  { backgroundColor: string; iconColor: string }
> = {
  neutral: {
    backgroundColor: colors.surfaceSubtle,
    iconColor: colors.primary,
  },
  primary: {
    backgroundColor: colors.primary,
    iconColor: colors.white,
  },
  danger: {
    backgroundColor: colors.error,
    iconColor: colors.white,
  },
  ghost: {
    backgroundColor: 'transparent',
    iconColor: colors.primary,
  },
};

export default function IconButton({
  icon,
  onPress,
  variant = 'neutral',
  accessibilityLabel,
  disabled = false,
  iconSize = 22,
  testID,
  style,
}: IconButtonProps) {
  const palette = VARIANT_STYLES[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: palette.backgroundColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Icon name={icon} size={iconSize} color={palette.iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    minWidth: sizes.touchMin,
    minHeight: sizes.touchMin,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
