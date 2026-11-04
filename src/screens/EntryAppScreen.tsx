import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import { colors, typography, shadows } from '../theme';

export interface EntryAppScreenProps {
  onNavigate: (screen: string) => void;
}

/** Figma: "Entrada no App (Expo)" — escolha entre Familiar e Idoso (HU-007). */
export default function EntryAppScreen({ onNavigate }: EntryAppScreenProps) {
  return (
    <ScreenWrapper hasHeader={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.badge}>
          <Icon name="verified_user" size={14} color={colors.successDark} />
          <Text style={styles.badgeText}>ACESSO SEGURO</Text>
        </View>

        <Text style={styles.title}>Cuidar de quem você ama começa aqui</Text>
        <Text style={styles.subtitle}>
          O login abre a página segura do SeniorInsight. Sua senha é digitada lá e o app nunca a recebe.
        </Text>

        <View style={styles.card} testID="entry-familiar-card">
          <Text style={styles.cardEyebrow}>SOU FAMILIAR</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onNavigate('Login')}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="entry-login"
          >
            <Icon name="login" size={22} color={colors.white} />
            <Text style={styles.primaryButtonText}>Entrar com minha conta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => onNavigate('Register')}
            accessibilityRole="button"
            testID="entry-register"
          >
            <Text style={styles.linkNavy}>Criar conta de familiar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card} testID="entry-idoso-card">
          <View style={styles.idosoRow}>
            <View style={styles.idosoIcon}>
              <Icon name="qr_code_scanner" size={24} color={colors.successDark} />
            </View>
            <View style={styles.idosoTexts}>
              <Text style={styles.idosoTitle}>Sou idoso</Text>
              <Text style={styles.idosoSub}>Use o código que seu familiar gerou no celular dele</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.greenButton}
            onPress={() => onNavigate('ElderlyQrScan')}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="entry-qr"
          >
            <Icon name="qr_code_scanner" size={22} color={colors.white} />
            <Text style={styles.primaryButtonText}>Entrar com QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => onNavigate('ElderlyEnterCode')}
            accessibilityRole="button"
            testID="entry-digitar-codigo"
          >
            <Text style={styles.linkGreen}>Digitar o código</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, alignItems: 'stretch' },
  logo: { width: 260, height: 48, alignSelf: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: colors.mintBg,
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: colors.successDark, fontFamily: typography.fontFamily.body },
  title: {
    marginTop: 16,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 12,
    ...shadows.tier1,
  },
  cardEyebrow: { fontSize: 14, color: colors.textSecondary, fontWeight: '600', fontFamily: typography.fontFamily.body },
  primaryButton: {
    minHeight: 56,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  greenButton: {
    minHeight: 64,
    borderRadius: 9999,
    backgroundColor: colors.successDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  linkButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkNavy: { fontSize: 16, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  linkGreen: { fontSize: 16, fontWeight: '700', color: colors.successDark, fontFamily: typography.fontFamily.heading },
  idosoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  idosoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idosoTexts: { flex: 1 },
  idosoTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.heading },
  idosoSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
});
