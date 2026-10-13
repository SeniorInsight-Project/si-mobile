import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Icon from './Icon';
import { colors, typography, shadows, rounded } from '../theme';

export default function PrimaryButton({
  title,
  onPress,
  variant = 'urgent', // 'urgent' (Coral do DESIGN.md/SVGs) ou 'navy' ou 'outline'
  icon,
  iconRight,
  style,
  textStyle,
  disabled = false,
}) {
  const isNavy = variant === 'navy' || variant === 'primary';
  const isOutline = variant === 'outline';
  
  const backgroundColor = isOutline
    ? 'transparent'
    : isNavy
    ? colors.primaryNavy
    : colors.secondaryCoral;

  const textColor = isOutline ? colors.primaryNavy : colors.onPrimary;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor },
        isOutline && styles.buttonOutline,
        isNavy && styles.shadowNavy,
        !isNavy && !isOutline && styles.shadowCoral,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <View style={styles.contentRow}>
        {icon && (
          <View style={styles.iconLeft}>
            <Icon name={icon} size={20} color={textColor} />
          </View>
        )}
        <Text style={[styles.buttonText, { color: textColor }, textStyle]}>
          {title}
        </Text>
        {iconRight && (
          <View style={styles.iconRight}>
            <Icon name={iconRight} size={20} color={textColor} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 52,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: colors.primaryNavy,
  },
  shadowCoral: {
    shadowColor: colors.secondaryCoral,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  shadowNavy: {
    shadowColor: colors.primaryNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: typography.fontFamily.heading,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});