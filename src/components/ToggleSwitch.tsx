import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (valor: boolean) => void;
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
}

/** Interruptor com área de toque de 48 dp (trilho de 56×32 dentro de uma área maior). */
export default function ToggleSwitch({ value, onValueChange, accessibilityLabel, testID, disabled }: ToggleSwitchProps) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      aria-checked={value}
      testID={testID}
      style={styles.hitArea}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff, disabled && styles.disabled]}>
        <View style={[styles.thumb, value ? styles.thumbOn : styles.thumbOff]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hitArea: { minWidth: 64, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  track: { width: 56, height: 32, borderRadius: 16, justifyContent: 'center', padding: 3 },
  trackOn: { backgroundColor: colors.successDark },
  trackOff: { backgroundColor: colors.outlineVariant },
  thumb: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  thumbOn: { alignSelf: 'flex-end' },
  thumbOff: { alignSelf: 'flex-start' },
  disabled: { opacity: 0.5 },
});
