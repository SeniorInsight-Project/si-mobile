import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import { colors, typography, shadows } from '../theme';
import { ResultadoPareamento, mensagemBoasVindas } from '../services/pareamentoService';

export interface ElderlyConnectedScreenProps {
  onNavigate: (screen: string) => void;
  pareamento: ResultadoPareamento | null;
}

/** Pareamento concluído (HU-007, cenário 1: "Olá, Maria" e o app fica conectado a este celular). */
export default function ElderlyConnectedScreen({ onNavigate, pareamento }: ElderlyConnectedScreenProps) {
  const saudacao = mensagemBoasVindas(pareamento?.nomeIdoso ?? '');

  return (
    <ScreenWrapper hasHeader={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.check} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="check" size={64} color={colors.white} />
        </View>

        <Text style={styles.title} accessibilityRole="header" testID="conectado-titulo">
          {saudacao}
        </Text>
        <Text style={styles.subtitle} testID="conectado-subtitulo">
          Pronto! Este celular agora está ligado à sua família.
        </Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.mintBg }]}>
              <Icon name="shield_check" size={22} color={colors.successDark} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Escolher o que compartilhar</Text>
              <Text style={styles.rowSub}>Você decide quais dados do relógio a família vê</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSubtle }]}>
              <Icon name="location_off" size={22} color={colors.textSecondary} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Localização desligada</Text>
              <Text style={styles.rowSub}>Só é enviada quando você aperta o SOS</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => onNavigate('ElderlyData')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continuar"
          testID="conectado-continuar"
        >
          <Icon name="arrow_forward" size={22} color={colors.white} />
          <Text style={styles.buttonText}>Continuar</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32, alignItems: 'stretch' },
  check: {
    alignSelf: 'center',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.successDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 24,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    color: colors.onSurface,
    fontFamily: typography.fontFamily.body,
  },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 20, gap: 20, ...shadows.tier1 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  rowIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rowTexts: { flex: 1 },
  rowTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  rowSub: { fontSize: 18, lineHeight: 24, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  button: {
    marginTop: 24,
    minHeight: 64,
    borderRadius: 9999,
    backgroundColor: colors.successDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: { fontSize: 20, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
});
