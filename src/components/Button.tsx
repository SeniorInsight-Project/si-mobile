import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Icon from './Icon';
import { font } from '../theme';
import {
  ButtonSize,
  ButtonVariant,
  resolveButtonStyle,
} from './buttonStyles';

/**
 * Botão padrão do SeniorInsight (§2 do plano de padronização visual):
 * - primary: ação principal da tela (CTAs de Login, Onboarding, salvar, convidar, Novo remédio).
 * - secondary: ação secundária neutra (ex.: Cancelar em modais).
 * - outline: ação secundária com contorno (ex.: controles auxiliares ou Cancelar no SOS).
 * - ghost: links de texto e ações terciárias (altura mínima 48 dp).
 * - danger: ações destrutivas (excluir, cancelar convite, rejeitar) — nunca usar coral.
 * - sos: exclusivamente para urgência, SOS e alerta crítico (coralDark + sombra coral).
 * - success: exclusivamente para fluxos do Modo Idoso e confirmação de dose ("Tomei").
 */
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: string;
  iconRight?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
  testID,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const resolved = resolveButtonStyle({
    variant,
    size,
    disabled,
    fullWidth,
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: resolved.backgroundColor,
          borderColor: resolved.borderColor,
          borderWidth: resolved.borderWidth,
          height: resolved.height,
          minHeight: resolved.minHeight,
          borderRadius: resolved.borderRadius,
          opacity: resolved.opacity,
          width: resolved.width,
        },
        resolved.shadow,
        !fullWidth && styles.compactPadding,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.content}>
          <ActivityIndicator size="small" color={resolved.textColor} />
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              styles.hiddenForWidth,
              { fontSize: resolved.fontSize },
            ]}
          >
            {title}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {iconLeft ? (
            <Icon name={iconLeft} size={resolved.iconSize} color={resolved.textColor} />
          ) : null}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: resolved.textColor,
                fontSize: resolved.fontSize,
              },
            ]}
          >
            {title}
          </Text>
          {iconRight ? (
            <Icon name={iconRight} size={resolved.iconSize} color={resolved.textColor} />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  // Compacto: centraliza no eixo cruzado do container (centro na coluna, meio na linha).
  // Para alinhar à esquerda, passe style={{ alignSelf: 'flex-start' }}.
  compactPadding: {
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    ...font('heading', 700),
    textAlign: 'center',
  },
  hiddenForWidth: {
    position: 'absolute',
    opacity: 0,
  },
});
