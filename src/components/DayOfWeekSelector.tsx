import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, font, rounded, shadows, sizes } from '../theme';

export interface DiaDaSemana {
  id: string;
  diaSemana: string;
  diaNumero: string;
  labelCompleta: string;
}

export type DiaSemanaItem = DiaDaSemana;

export const DIAS_DA_SEMANA_PADRAO: DiaDaSemana[] = [
  { id: '2026-10-21', diaSemana: 'SEG', diaNumero: '21', labelCompleta: 'Segunda-feira, 21 Out' },
  { id: '2026-10-22', diaSemana: 'TER', diaNumero: '22', labelCompleta: 'Terça-feira, 22 Out' },
  { id: '2026-10-23', diaSemana: 'QUA', diaNumero: '23', labelCompleta: 'Quarta-feira, 23 Out' },
  { id: '2026-10-24', diaSemana: 'QUI', diaNumero: '24', labelCompleta: 'Quinta-feira, 24 Out' },
  { id: '2026-10-25', diaSemana: 'SEX', diaNumero: '25', labelCompleta: 'Sexta-feira, 25 Out' },
  { id: '2026-10-26', diaSemana: 'SÁB', diaNumero: '26', labelCompleta: 'Sábado, 26 Out' },
  { id: '2026-10-27', diaSemana: 'DOM', diaNumero: '27', labelCompleta: 'Domingo, 27 Out' },
];

export interface DayOfWeekSelectorProps {
  selectedDate?: string;
  onSelectDate?: (item: DiaDaSemana) => void;
  dias?: DiaDaSemana[];
}

export default function DayOfWeekSelector({
  selectedDate = '2026-10-24',
  onSelectDate,
  dias = DIAS_DA_SEMANA_PADRAO,
}: DayOfWeekSelectorProps) {
  return (
    <View style={styles.rowContainer}>
      {dias.map((item) => {
        const isSelected =
          item.id === selectedDate || item.diaNumero === selectedDate;

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.dayCard, isSelected && styles.dayCardActive]}
            onPress={() => onSelectDate && onSelectDate(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={item.labelCompleta}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.dayName, isSelected && styles.dayNameActive]} numberOfLines={1}>
              {item.diaSemana}
            </Text>
            <Text style={[styles.dayNumber, isSelected && styles.dayNumberActive]}>
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
