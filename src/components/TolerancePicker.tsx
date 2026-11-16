import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { colors, font, rounded, shadows, sizes } from '../theme';

export interface TolerancePickerProps {
  selectedTolerance?: number;
  onSelectTolerance?: (mins: number) => void;
}

export default function TolerancePicker({
  selectedTolerance = 15,
  onSelectTolerance,
}: TolerancePickerProps) {
  const options = [10, 15, 30];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Icon name="notifications" size={18} color={colors.coralDark} />
          </View>
          <View>
            <Text style={styles.title}>Janela de Tolerância</Text>
            <Text style={styles.subtitle}>Notificação Ativa</Text>
          </View>
        </View>
      </View>

      <View style={styles.pillTray}>
        {options.map((mins) => {
          const isSelected = selectedTolerance === mins;

          return (
            <TouchableOpacity
              key={mins}
              style={[styles.pillButton, isSelected && styles.pillButtonActive]}
              onPress={() => onSelectTolerance && onSelectTolerance(mins)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.pillButtonText,
                  isSelected && styles.pillButtonTextActive,
                ]}
              >
                {mins} min
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.footerHint}>
        O familiar será alertado se o remédio atrasar {selectedTolerance} min.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 20,
    marginBottom: 20,
    ...shadows.tier1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: colors.peach.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 500),
  },
  pillTray: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.lg,
    padding: 6,
    gap: 8,
    marginBottom: 10,
  },
  pillButton: {
    flex: 1,
    minHeight: sizes.touchMin,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('heading', 600),
  },
  pillButtonTextActive: {
    color: colors.white,
    ...font('body', 700),
  },
  footerHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    ...font('body', 500),
  },
});
