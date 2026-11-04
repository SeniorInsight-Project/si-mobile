import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { typography } from '../theme';

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
            <Icon name="notifications" size={18} color="#B51C13" />
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

      <Text style={styles.footerHint}>
        O familiar será alertado se o remédio atrasar {selectedTolerance} min.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
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
    borderRadius: 18,
    backgroundColor: '#FFF1EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  pillTray: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 6,
    gap: 6,
    marginBottom: 10,
  },
  pillButton: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButtonActive: {
    backgroundColor: '#031753',
  },
  pillButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: typography.fontFamily.heading,
  },
  pillButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerHint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
  },
});
