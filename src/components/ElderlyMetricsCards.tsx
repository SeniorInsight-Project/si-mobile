import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import {
  apresentarBiometria,
  type BiometriaIdoso,
  type CartaoBiometria,
} from '../services/elderlyTelemetryService';
import { colors, typography, shadows } from '../theme';

export interface ElderlyMetricsCardsProps {
  biometria: BiometriaIdoso | null;
  onPressPassos?: () => void;
  onPressBatimentos?: () => void;
}

interface CartaoProps {
  cartao: CartaoBiometria;
  icone: string;
  corFundo: string;
  corBorda: string;
  corTexto: string;
  onPress?: () => void;
  testID: string;
}

function Cartao({ cartao, icone, corFundo, corBorda, corTexto, onPress, testID }: CartaoProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: corFundo, borderColor: corBorda }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={cartao.acessibilidade}
      testID={testID}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.white }]}>
        <Icon name={icone} size={26} color={corTexto} />
      </View>
      <View style={styles.valueRow}>
        <Text style={[cartao.semDados ? styles.semDados : styles.metricNumber, { color: corTexto }]}>{cartao.valor}</Text>
        {cartao.unidade && <Text style={styles.unidade}>{cartao.unidade}</Text>}
      </View>
      <Text style={styles.metricLabel}>{cartao.rotulo}</Text>
    </TouchableOpacity>
  );
}

/**
 * Passos do dia e último batimento na tela do idoso (HU-030 / RNF-006): números grandes, textos de 18 sp
 * ou mais. O cartão de um tipo não autorizado não aparece; sem leitura, o cartão diz "Sem dados".
 */
export default function ElderlyMetricsCards({ biometria, onPressPassos, onPressBatimentos }: ElderlyMetricsCardsProps) {
  if (!biometria) return null;
  const { passos, batimentos, atualizacao } = apresentarBiometria(biometria);
  if (!passos && !batimentos) return null;

  return (
    <View style={styles.container} testID="elderly-metrics-container">
      <View style={styles.row}>
        {passos && (
          <Cartao
            cartao={passos}
            icone="walk"
            corFundo={colors.peach.background}
            corBorda={colors.peach.border}
            corTexto={colors.coralDark}
            onPress={onPressPassos}
            testID="card-passos-idoso"
          />
        )}
        {batimentos && (
          <Cartao
            cartao={batimentos}
            icone="favorite"
            corFundo={colors.sky.background}
            corBorda={colors.sky.border}
            corTexto={colors.primary}
            onPress={onPressBatimentos}
            testID="card-batimentos-idoso"
          />
        )}
      </View>
      {atualizacao && (
        <Text style={styles.atualizacao} testID="biometria-atualizacao">
          {atualizacao}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    minHeight: 150,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    gap: 6,
    ...shadows.tier1,
  },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  metricNumber: { fontSize: 32, lineHeight: 38, fontWeight: '800', fontFamily: typography.fontFamily.heading },
  semDados: { fontSize: 22, lineHeight: 28, fontWeight: '800', fontFamily: typography.fontFamily.heading },
  unidade: { fontSize: 18, fontWeight: '700', color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  metricLabel: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: colors.onSurface, fontFamily: typography.fontFamily.body },
  atualizacao: { fontSize: 18, lineHeight: 24, fontWeight: '600', color: colors.textSecondary, fontFamily: typography.fontFamily.body },
});
