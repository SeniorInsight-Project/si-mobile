import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import CodigoPareamentoPainel from '../components/CodigoPareamentoPainel';
import { colors, typography } from '../theme';
import { saudacaoIdoso } from '../services/pareamentoService';

export interface PairingCodeScreenProps {
  onNavigate: (screen: string) => void;
  idosoId: string;
  nomeIdoso: string;
}

/**
 * Figma: "Código de Pareamento" — passo 2 de 2 (HU-008 cenário 1, RF-006, RN-020).
 * O código e o QR vêm do identity-service; o app não gera nem guarda código.
 */
export default function PairingCodeScreen({ onNavigate, idosoId, nomeIdoso }: PairingCodeScreenProps) {
  const tratamento = saudacaoIdoso(nomeIdoso) || 'o idoso';

  return (
    <ScreenWrapper>
      <AppHeader title="Código de Pareamento" onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={styles.content}>
        <CodigoPareamentoPainel
          idosoId={idosoId}
          nomeIdoso={nomeIdoso}
          cabecalho={
            <>
              <View style={styles.stepChip}>
                <Icon name="link" size={14} color={colors.primary} />
                <Text style={styles.stepText}>PASSO 2 DE 2</Text>
              </View>
              <Text style={styles.title} accessibilityRole="header">
                Conecte o celular de {tratamento}
              </Text>
              <Text style={styles.subtitle}>
                No celular do idoso, abra o SeniorInsight e toque em "Entrar com QR Code". Se preferir, é possível
                digitar o código.
              </Text>
            </>
          }
        />
      </ScrollView>
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 110 },
  stepChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: colors.skyBg,
  },
  stepText: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.body },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
});
