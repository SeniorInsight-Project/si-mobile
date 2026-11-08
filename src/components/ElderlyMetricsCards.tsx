import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import type { DadosIdosoBiometria } from '../services/elderlyTelemetryService';
import { typography, shadows } from '../theme';

export interface ElderlyMetricsCardsProps {
  biometria: DadosIdosoBiometria | null;
  onPressPassos?: () => void;
  onPressBatimentos?: () => void;
}

/**
 * Cartões de passos e batimentos na tela do idoso (HU-030 / RNF-006).
 * - Números grandes (>= 18sp / 28px bold).
 * - Textos canônicos da HU-030: "X passos hoje" e "X batimentos por minuto".
 * - Oculta o cartão cujo tipo de dado não foi autorizado pelo idoso (Cenário 2 da HU-030).
 */
export default function ElderlyMetricsCards({
  biometria,
  onPressPassos,
  onPressBatimentos,
}: ElderlyMetricsCardsProps) {
  if (!biometria) return null;

  const {
    passosHoje,
    frequenciaCardiaca,
    passosAutorizados,
    batimentosAutorizados,
  } = biometria;

  // Se nenhum tipo estiver autorizado, não renderiza a seção
  if (!passosAutorizados && !batimentosAutorizados) {
    return null;
  }

  const passosFormatados = passosHoje ? passosHoje.toLocaleString('pt-BR') : '0';

  return (
    <View style={styles.container} testID="elderly-metrics-container">
      {/* CARTÃO DE PASSOS DE HOJE (HU-030 Cenário 1) */}
      {passosAutorizados && (
        <TouchableOpacity
          style={[styles.card, styles.passosCard]}
          onPress={onPressPassos}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${passosFormatados} passos hoje`}
          testID="card-passos-idoso"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFEBE5' }]}>
              <Icon name="walk" size={24} color="#B51C13" />
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>HOJE</Text>
            </View>
          </View>

          {/* Número grande >= 18sp (30px Bold Plus Jakarta Sans) */}
          <Text style={[styles.metricNumber, { color: '#B51C13' }]}>
            {passosFormatados}
          </Text>

          {/* Texto canônico da HU-030 */}
          <Text style={styles.metricLabel}>passos hoje</Text>
        </TouchableOpacity>
      )}

      {/* CARTÃO DE ÚLTIMO BATIMENTO (HU-030 Cenário 1) */}
      {batimentosAutorizados && (
        <TouchableOpacity
          style={[styles.card, styles.batimentosCard]}
          onPress={onPressBatimentos}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${frequenciaCardiaca || '--'} batimentos por minuto`}
          testID="card-batimentos-idoso"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#E6F3FA' }]}>
              <Icon name="favorite" size={24} color="#031753" />
            </View>
            <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
              <Text style={[styles.badgeText, { color: '#0369A1' }]}>ÚLTIMO</Text>
            </View>
          </View>

          {/* Número grande >= 18sp (30px Bold Plus Jakarta Sans) */}
          <View style={styles.valueUnitRow}>
            <Text style={[styles.metricNumber, { color: '#031753' }]}>
              {frequenciaCardiaca > 0 ? frequenciaCardiaca : '--'}
            </Text>
            <Text style={styles.unitText}>bpm</Text>
          </View>

          {/* Texto canônico da HU-030 */}
          <Text style={styles.metricLabel}>batimentos por minuto</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    minHeight: 130,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  passosCard: {
    backgroundColor: '#FFF8F6',
    borderColor: '#FFCDC2',
  },
  batimentosCard: {
    backgroundColor: '#F0F8FF',
    borderColor: '#C4E4F5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: '#FFE2DB',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B51C13',
    letterSpacing: 0.5,
  },
  valueUnitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricNumber: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: typography.fontFamilyDisplay,
    lineHeight: 34,
  },
  unitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  metricLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.fontFamilyBody,
    color: '#475569',
    marginTop: 2,
  },
});
