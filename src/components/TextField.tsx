import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Icon from './Icon';
import { colors, font, rounded, sizes } from '../theme';

/**
 * Campo de texto padrão do SeniorInsight (§1 D9 e §2.7–2.8 do plano):
 * - Altura padrão 52 dp (sizes.input); multiline com minHeight 96 dp.
 * - Raio rounded.input (14), borda 1.5 (padrão colors.border, foco colors.primary, erro colors.error).
 * - Texto 16 px Inter 400; label 14 px Inter 600; erro e helperText >= 14 px.
 * - Compatível com as props legadas de InputField.
 */
export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  rightLabel?: React.ReactNode;
  placeholder?: string;
  icon?: string;
  isPassword?: boolean;
  variant?: 'white' | 'grey';
  rightElement?: React.ReactNode;
  bottomElement?: React.ReactNode;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export default function TextField({
  label,
  rightLabel,
  placeholder,
  icon,
  isPassword,
  variant = 'white',
  rightElement,
  bottomElement,
  error,
  helperText,
  multiline = false,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [isPasswordHidden, setIsPasswordHidden] = useState(Boolean(isPassword));
  const [isFocused, setIsFocused] = useState(false);

  const resolveIconName = () => {
    if (!icon) return null;
    if (icon === 'mail' || icon.includes('mail')) return 'mail';
    if (icon === 'lock' || icon.includes('lock')) return 'lock';
    if (icon === 'user' || icon.includes('user') || icon === 'person') return 'person';
    if (icon === 'phone' || icon === 'call') return 'call';
    return icon;
  };

  const iconName = resolveIconName();
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, style]}>
      {(label || rightLabel) && (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {rightLabel}
        </View>
      )}

      <View
        style={[
          styles.inputArea,
          variant === 'grey' ? styles.inputAreaGrey : styles.inputAreaSurface,
          multiline && styles.inputAreaMultiline,
          isFocused && styles.inputAreaFocused,
          hasError && styles.inputAreaError,
        ]}
      >
        {iconName ? (
          <View style={[styles.iconContainer, multiline && styles.iconMultiline]}>
            <Icon
              name={iconName}
              size={20}
              color={
                hasError
                  ? colors.error
                  : isFocused
                    ? colors.primary
                    : colors.textSecondary
              }
            />
          </View>
        ) : null}

        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isPassword ? isPasswordHidden : rest.secureTextEntry}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {rightElement}

        {isPassword && !rightElement ? (
          <TouchableOpacity
            onPress={() => setIsPasswordHidden(!isPasswordHidden)}
            style={styles.eyeButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isPasswordHidden ? 'Mostrar senha' : 'Ocultar senha'}
          >
            <Icon
              name={isPasswordHidden ? 'visibility_off' : 'visibility'}
              size={20}
              color={isPasswordHidden ? colors.textSecondary : colors.primary}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}

      {bottomElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...font('body', 600),
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.input,
    borderRadius: rounded.input,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  inputAreaSurface: {
    backgroundColor: colors.surface,
  },
  inputAreaGrey: {
    backgroundColor: colors.surfaceSubtle,
  },
  inputAreaMultiline: {
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputAreaFocused: {
    borderColor: colors.primary,
  },
  inputAreaError: {
    borderColor: colors.error,
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconMultiline: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    ...font('body', 400),
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    paddingVertical: 10,
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 0,
  },
  eyeButton: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  errorText: {
    ...font('body', 500),
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
    marginTop: 6,
  },
  helperText: {
    ...font('body', 400),
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
