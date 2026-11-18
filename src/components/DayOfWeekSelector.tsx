import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, font, rounded, shadows, sizes } from '../theme';
import { gerarSemana, type DiaDaSemana } from '../services/semanaRemedios';

export type { DiaDaSemana } from '../services/semanaRemedios';
export type DiaSemanaItem = DiaDaSemana;

export interface DayOfWeekSelectorProps {
  selectedDate: string;
  onSelectDate?: (item: DiaDaSemana) => void;
  /** Padrão: a semana atual (segunda a domingo). */
  dias?: DiaDaSemana[];
}

export default function DayOfWeekSelector({
  selectedDate,
  onSelectDate,
  dias = gerarSemana(),
}: DayOfWeekSelectorProps) {
  return (
    <View style={styles.rowContainer}>
      {dias.map((item) => {
        const isSelected = item.id === selectedDate;

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.dayCard, isSelected && styles.dayCardActive]}
            onPress={() => onSelectDate && onSelectDate(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={item.ehHoje ? `${item.labelCompleta}, hoje` : item.labelCompleta}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.dayName, isSelected && styles.dayNameActive]} numberOfLines={1}>
              {item.diaSemana}
            </Text>
            <Text style={[styles.dayNumber, isSelected && styles.dayNumberActive]} numberOfLines={1}>
              {item.diaNumero}
            </Text>
            {isSelected && <View style={styles.activeGreenDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  dayCard: {
    flex: 1,
    minWidth: sizes.touchMin - 4,
    minHeight: 66,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 6,
  },
  dayCardActive: {
    backgroundColor: colors.primary,
    ...shadows.tier1,
  },
  dayName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    ...font('heading', 700),
  },
  dayNameActive: {
    color: colors.outlineVariant,
  },
  dayNumber: {
    fontSize: 15,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  dayNumberActive: {
    color: colors.white,
  },
  activeGreenDot: {
    position: 'absolute',
    bottom: 5,
    width: 6,
    height: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.success,
  },
});
