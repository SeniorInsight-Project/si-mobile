import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import { typography } from '../theme';

export default function OnboardingScreen({ onNavigate }) {
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
              source={require('../../assets/figma/onboarding-illustration.jpg')}
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
              <Icon name="medication" size={15} color="#003B26" />
              <Text style={[styles.featurePillText, { color: '#003B26' }]}>
                Remédios no horário
              </Text>
            </View>

            <View style={[styles.featurePill, styles.pillCoral]}>
              <Icon name="crisis_alert" size={15} color="#B51C13" />
              <Text style={[styles.featurePillText, { color: '#B51C13' }]}>
                SOS em 1 toque
              </Text>
            </View>
          </View>

          {/* Linha 2: 1 pílula centralizada */}
          <View style={styles.pillsRowCenter}>
            <View style={[styles.featurePill, styles.pillSky]}>
              <Icon name="groups" size={15} color="#2D418A" />
              <Text style={[styles.featurePillText, { color: '#2D418A' }]}>
                Família conectada
              </Text>
            </View>
          </View>
        </View>

        {/* BLOCO 4: BOTÃO COMEÇAR E LINK DE ENTRAR */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => onNavigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaButtonText}>Começar Agora</Text>
            <Icon name="arrow_forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => onNavigate('Login')}>
              <Text style={styles.loginLink}>Entrar</Text>
            </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 9999,
    marginBottom: 8,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  badgeText: {
    color: '#031753',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
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
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  glowTopRight: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EBF5FF',
    opacity: 0.7,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -24,
    left: -24,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFEBE7',
    opacity: 0.6,
  },
  illustration: {
    width: '100%',
    height: 220,
    borderRadius: 16,
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
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 32,
    backgroundColor: '#031753',
  },
  contentContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#131E3D',
    textAlign: 'center',
    lineHeight: 34,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 10,
    fontFamily: typography.fontFamily.body,
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
    borderRadius: 9999,
    gap: 6,
  },
  pillMint: {
    backgroundColor: '#E8F8F0',
  },
  pillCoral: {
    backgroundColor: '#FFEBE7',
  },
  pillSky: {
    backgroundColor: '#EBF5FF',
  },
  featurePillText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.fontFamily.heading,
  },
  footer: {
    marginTop: 22,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    height: 60,
    borderRadius: 9999,
    backgroundColor: '#D83729',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#D83729',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  loginPrompt: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#031753',
    fontFamily: typography.fontFamily.heading,
  },
});