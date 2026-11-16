import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, font, rounded, shadows, typography } from '../theme';
import { useAutenticacaoKeycloak, type DesfechoAutenticacao } from '../services/authService';

export interface EntryAppScreenProps {
  onNavigate: (screen: string) => void;
  /** Resultado da volta do cadastro do Keycloak. */
  onDesfecho: (desfecho: DesfechoAutenticacao) => void;
}

/** Figma: "Entrada no App (Expo)" — escolha entre Familiar e Idoso (HU-007). */
export default function EntryAppScreen({ onNavigate, onDesfecho }: EntryAppScreenProps) {
  const { pronto, carregando, erro, criarConta } = useAutenticacaoKeycloak();

  return (
    <ScreenWrapper hasHeader={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.badge}>
          <Icon name="verified_user" size={16} color={colors.successDark} />
          <Text style={styles.badgeText}>ACESSO SEGURO</Text>
        </View>

        <Text style={styles.title}>Cuidar de quem você ama começa aqui</Text>
        <Text style={styles.subtitle}>
          O login abre a página segura do SeniorInsight. Sua senha é digitada lá e o app nunca a recebe.
        </Text>

        <View style={styles.card} testID="entry-familiar-card">
          <Text style={styles.cardEyebrow}>SOU FAMILIAR</Text>

          <Button
            title="Entrar com minha conta"
            onPress={() => onNavigate('Login')}
            variant="primary"
            size="lg"
            iconLeft="login"
            testID="entry-login"
          />

          <Button
            title="Criar conta de familiar"
            onPress={async () => onDesfecho(await criarConta())}
            variant="ghost"
            loading={carregando}
            disabled={!pronto || carregando}
            testID="entry-criar-conta"
          />
          {erro ? <Text style={styles.errorText}>{erro}</Text> : null}
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

          <Button
            title="Ler QR Code"
            onPress={() => onNavigate('ElderlyQrScan')}
            variant="success"
            size="xl"
            iconLeft="qr_code_scanner"
            accessibilityLabel="Sou o idoso: ler QR Code"
            testID="entry-qr"
          />

          <Button
            title="Digitar o código"
            onPress={() => onNavigate('ElderlyEnterCode')}
            variant="ghost"
            accessibilityLabel="Sou o idoso: digitar o código"
            testID="entry-digitar-codigo"
          />
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
    borderRadius: rounded.full,
    backgroundColor: colors.mint.background,
  },
  badgeText: { fontSize: 14, color: colors.successDark, ...font('body', 700) },
  title: {
    marginTop: 16,
    ...typography.headlineLg,
    textAlign: 'center',
    color: colors.primary,
  },
  subtitle: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
    ...font('body', 400),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.xl,
    padding: 20,
    marginBottom: 16,
    gap: 12,
    ...shadows.tier1,
  },
  cardEyebrow: { fontSize: 14, color: colors.textSecondary, ...font('body', 600) },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    color: colors.error,
    ...font('body', 600),
  },
  idosoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  idosoIcon: {
    width: 48,
    height: 48,
    borderRadius: rounded.full,
    backgroundColor: colors.mint.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idosoTexts: { flex: 1 },
  idosoTitle: { fontSize: 18, color: colors.primary, ...font('heading', 700) },
  idosoSub: { fontSize: 18, lineHeight: 24, color: colors.textSecondary, ...font('body', 400) },
});
