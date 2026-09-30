import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

export const DIAS_DA_SEMANA_PADRAO = [
  { id: '2026-10-21', diaSemana: 'SEG', diaNumero: '21', labelCompleta: 'Segunda-feira, 21 Out' },
  { id: '2026-10-22', diaSemana: 'TER', diaNumero: '22', labelCompleta: 'Terça-feira, 22 Out' },
  { id: '2026-10-23', diaSemana: 'QUA', diaNumero: '23', labelCompleta: 'Quarta-feira, 23 Out' },
  { id: '2026-10-24', diaSemana: 'QUI', diaNumero: '24', labelCompleta: 'Quinta-feira, 24 Out' },
  { id: '2026-10-25', diaSemana: 'SEX', diaNumero: '25', labelCompleta: 'Sexta-feira, 25 Out' },
  { id: '2026-10-26', diaSemana: 'SÁB', diaNumero: '26', labelCompleta: 'Sábado, 26 Out' },
  { id: '2026-10-27', diaSemana: 'DOM', diaNumero: '27', labelCompleta: 'Domingo, 27 Out' },
];

export default function DayOfWeekSelector({
  selectedDate = '2026-10-24',
  onSelectDate,
  dias = DIAS_DA_SEMANA_PADRAO,
}) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {dias.map((item) => {
          const isSelected = item.id === selectedDate || item.diaNumero === selectedDate;

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
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberActive]}>
                {item.diaNumero}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  scrollContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 2,
  },
  dayCard: {
    flex: 1,
    height: 54,
    marginHorizontal: 3,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayCardActive: {
    backgroundColor: '#031753',
    borderColor: '#031753',
    elevation: 3,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    transform: [{ scale: 1.03 }],
  },
  dayName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dayNameActive: {
    color: '#93C5FD',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#031753',
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
});
