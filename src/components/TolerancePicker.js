import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Sliders } from 'lucide-react-native';

export default function TolerancePicker({
  selectedTolerance = 15,
  onSelectTolerance,
}) {
  const options = [10, 15, 30];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Sliders size={20} color="#0284C7" />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Janela de Tolerância</Text>
            <View style={styles.activeTag}>
              <View style={styles.greenDot} />
              <Text style={styles.activeTagText}>Notificação Ativa</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Tempo de tolerância antes de avisar os cuidadores e familiares.
          </Text>
        </View>
      </View>

      <View style={styles.buttonsRow}>
        {options.map((mins) => {
          const isSelected = selectedTolerance === mins;

          return (
            <TouchableOpacity
              key={mins}
              style={[styles.pillButton, isSelected && styles.pillButtonActive]}
              onPress={() => onSelectTolerance && onSelectTolerance(mins)}
              activeOpacity={0.8}
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#031753',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  activeTagText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  pillButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonActive: {
    backgroundColor: '#031753',
    elevation: 3,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pillButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  pillButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
