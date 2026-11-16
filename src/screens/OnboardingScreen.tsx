import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, font, rounded, shadows, typography } from '../theme';

export interface OnboardingScreenProps {
  onNavigate: (screen: string) => void;
}

export default function OnboardingScreen({ onNavigate }: OnboardingScreenProps) {
  return (
    <ScreenWrapper hasHeader={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* BLOCO 1: TOPO */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Cuidado &amp; Conexão Familiar</Text>
          </View>

          <Image
            source={require('../../assets/logoComTexto.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* BLOCO 2: CARD DA ILUSTRAÇÃO + BRILHOS DECORATIVOS + INDICADORES */}
        <View style={styles.illustrationContainer}>
          <View style={styles.imageCard}>
            <View style={styles.glowTopRight} />
            <View style={styles.glowBottomLeft} />
            <Image
              source={require('../../assets/onbor_img.png')}
              style={styles.illustration}
              resizeMode="cover"
            />
          </View>

          {/* Bolinhas do carrossel */}
          <View style={styles.pagination}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* BLOCO 3: TÍTULO, SUBTÍTULO E PÍLULAS DE BENEFÍCIOS */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>
            Cuidando de quem você ama, a cada segundo
          </Text>

          <Text style={styles.subtitle}>
            Monitoramento de rotina de remédios, alertas SOS inteligentes e rede
            familiar unida pelo bem-estar de quem mais importa.
          </Text>

          {/* Linha 1: 2 pílulas */}
          <View style={styles.pillsRow}>
            <View style={[styles.featurePill, styles.pillMint]}>
              <Icon name="medication" size={16} color={colors.mint.textDark} />
              <Text style={[styles.featurePillText, { color: colors.mint.textDark }]}>
                Remédios no horário
              </Text>
            </View>

            <View style={[styles.featurePill, styles.pillCoral]}>
              <Icon name="crisis_alert" size={16} color={colors.peach.text} />
              <Text style={[styles.featurePillText, { color: colors.peach.text }]}>
                SOS em 1 toque
              </Text>
            </View>
          </View>

          {/* Linha 2: 1 pílula centralizada */}
          <View style={styles.pillsRowCenter}>
            <View style={[styles.featurePill, styles.pillSky]}>
              <Icon name="groups" size={16} color={colors.primaryNavy} />
              <Text style={[styles.featurePillText, { color: colors.primaryNavy }]}>
                Família conectada
              </Text>
            </View>
          </View>
        </View>

        {/* BLOCO 4: BOTÃO COMEÇAR E LINK DE ENTRAR */}
        <View style={styles.footer}>
          <Button
            title="Começar Agora"
            onPress={() => onNavigate('EntryApp')}
            variant="primary"
            size="lg"
            iconRight="arrow_forward"
            accessibilityLabel="Começar agora: escolher se sou familiar ou idoso"
            testID="onboarding-comecar"
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Já tem uma conta? </Text>
            <Button
              title="Entrar"
              onPress={() => onNavigate('Login')}
              variant="ghost"
              fullWidth={false}
              accessibilityLabel="Já tenho conta: entrar"
              testID="onboarding-entrar"
            />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    marginBottom: 8,
    ...shadows.tier1,
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.success,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 14,
    ...font('heading', 700),
  },
  logoImage: {
    width: 220,
    height: 76,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  imageCard: {
    width: '100%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: rounded.card,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    ...shadows.tier2,
  },
  glowTopRight: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 96,
    height: 96,
    borderRadius: rounded.full,
    backgroundColor: colors.infoSurface,
    opacity: 0.7,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -24,
    left: -24,
    width: 112,
    height: 112,
    borderRadius: rounded.full,
    backgroundColor: colors.peach.background,
    opacity: 0.6,
  },
  illustration: {
    width: '100%',
    height: 220,
    borderRadius: rounded.lg,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.outlineVariant,
  },
  activeDot: {
    width: 32,
    backgroundColor: colors.primary,
  },
  contentContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  title: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 10,
    ...font('body', 400),
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  pillsRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    gap: 6,
  },
  pillMint: {
    backgroundColor: colors.mint.background,
  },
  pillCoral: {
    backgroundColor: colors.peach.background,
  },
  pillSky: {
    backgroundColor: colors.infoSurface,
  },
  featurePillText: {
    fontSize: 14,
    ...font('heading', 600),
  },
  footer: {
    marginTop: 22,
    alignItems: 'center',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  loginPrompt: {
    fontSize: 16,
    color: colors.textSecondary,
    ...font('body', 500),
  },
});
