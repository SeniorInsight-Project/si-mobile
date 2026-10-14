import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { colors, typography } from '../theme';

export default function InputField({
  label,
  rightLabel,
  placeholder,
  icon,
  isPassword,
  variant = 'white', // 'white' (#FFFFFF com sombra) ou 'grey' (#F5F7FA)
  rightElement,
  bottomElement,
  style,
  inputStyle,
  ...rest
}) {
  const [isPasswordHidden, setIsPasswordHidden] = useState(isPassword);
  const [isFocused, setIsFocused] = useState(false);

  const getIconName = () => {
    if (!icon) return null;
    if (icon === 'mail' || icon.includes('mail')) return 'mail';
    if (icon === 'lock' || icon.includes('lock')) return 'lock';
    if (icon === 'user' || icon.includes('user') || icon === 'person') return 'person';
    if (icon === 'phone' || icon === 'call') return 'call';
    return icon;
  };

  const iconName = getIconName();

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
          variant === 'grey' ? styles.inputAreaGrey : styles.inputAreaWhite,
          isFocused && styles.inputAreaFocused,
        ]}
      >
        {iconName && (
          <View style={styles.iconContainer}>
            <Icon
              name={iconName}
              size={20}
              color={isFocused ? colors.primaryNavy : '#64748B'}
            />
          </View>
        )}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#64748B"
          secureTextEntry={isPasswordHidden}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {rightElement}

        {isPassword && !rightElement && (
          <TouchableOpacity
            onPress={() => setIsPasswordHidden(!isPasswordHidden)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <Icon
              name={isPasswordHidden ? 'visibility_off' : 'visibility'}
              size={20}
              color={isPasswordHidden ? '#64748B' : colors.primaryNavy}
            />
          </TouchableOpacity>
        )}
      </View>

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
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 18,
    height: 56,
  },
  inputAreaWhite: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  inputAreaGrey: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputAreaFocused: {
    borderColor: '#031753',
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#131E3D',
    fontFamily: typography.fontFamily.body,
  },
  eyeButton: {
    padding: 6,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});