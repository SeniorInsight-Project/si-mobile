import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { typography } from '../theme';

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
            activeOpacity={0.8}
          >
            <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>
              {item.diaSemana}
            </Text>
            <Text
              style={[styles.dayNumber, isSelected && styles.dayNumberActive]}
            >
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
    gap: 6,
  },
  dayCard: {
    flex: 1,
    height: 60,
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCardActive: {
    backgroundColor: '#031753',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  dayNameActive: {
    color: '#CBD5E1',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  activeGreenDot: {
    position: 'absolute',
    bottom: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
});
