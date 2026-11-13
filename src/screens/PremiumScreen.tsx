import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import { colors, rounded, shadows, typography } from '../theme';
import {
  comparativoPlanos,
  DireitoPremium,
  formatarFaixaTrial,
  obterDireitoPremium,
} from '../services/premiumService';

export interface PremiumScreenProps {
  onNavigate: (screen: string) => void;
}

export default function PremiumScreen({ onNavigate }: PremiumScreenProps) {
  const [direito, setDireito] = useState<DireitoPremium | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await obterDireitoPremium();
      setDireito(res);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível verificar seu plano.');
      setDireito(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const faixaTrial = formatarFaixaTrial(direito);
  const comp = comparativoPlanos(direito);

  return (
    <ScreenWrapper>
      <AppHeader
        title="Conhecer o Premium"
        onNavigate={onNavigate}
        onPressLogo={() => onNavigate('Home')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {carregando ? (
          <View style={styles.card}>
            <ActivityIndicator color={colors.primaryNavy} size="small" />
            <Text style={styles.bodyCenter}>Verificando situação do plano...</Text>
          </View>
        ) : erro ? (
          <View style={styles.errorCard}>
            <Icon name="warning" size={24} color={colors.coralDark} />
            <Text style={styles.errorText}>{erro}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={carregar} activeOpacity={0.85}>
              <Text style={styles.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {comp.mensagemB2B && (
              <View style={styles.b2bCard}>
                <Icon name="verified_user" size={22} color={colors.mint.text} />
                <Text style={styles.b2bText}>{comp.mensagemB2B}</Text>
              </View>
            )}

            {faixaTrial && (
              <View style={styles.trialCard}>
                <Icon name="stars" size={22} color={colors.amber.text} />
                <Text style={styles.trialText}>{faixaTrial}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plano Gratuito (sempre livre)</Text>
          <Text style={styles.cardSub}>Recursos vitais de segurança nunca são bloqueados.</Text>
          {comp.recursosFree.map((item) => (
            <View key={item} style={styles.featureRow}>
              <Icon name="check_circle" size={18} color={colors.mint.text} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, styles.premiumCard]}>
          <View style={styles.premiumHeader}>
            <Text style={styles.cardTitle}>Plano Premium</Text>
            {comp.precoMensalTexto ? (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{comp.precoMensalTexto}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardSub}>
            {comp.precoMensalTexto
              ? 'Acompanhamento preditivo completo para toda a rede familiar.'
              : 'Valor mensal informado quando o módulo de assinatura estiver disponível.'}
          </Text>
          {comp.recursosPremium.map((item) => (
            <View key={item} style={styles.featureRow}>
              <Icon name="vital_signs" size={18} color={colors.primaryNavy} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNavBar currentScreen="Home" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 20,
    gap: 10,
    ...shadows.tier1,
  },
  premiumCard: {
    borderWidth: 1.5,
    borderColor: colors.lavender.border,
    backgroundColor: colors.lavender.background,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  priceBadge: {
    backgroundColor: colors.primaryNavy,
    borderRadius: rounded.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
  },
  cardSub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
    fontFamily: typography.fontFamily.body,
  },
  bodyCenter: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: colors.peach.background,
    borderWidth: 1,
    borderColor: colors.peach.border,
    borderRadius: rounded.card,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.coralDark,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primaryNavy,
    borderRadius: rounded.full,
    paddingHorizontal: 20,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  b2bCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.mint.background,
    borderWidth: 1,
    borderColor: colors.mint.border,
    borderRadius: rounded.lg,
    padding: 16,
  },
  b2bText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.mint.text,
  },
  trialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.amber.background,
    borderWidth: 1,
    borderColor: colors.amber.border,
    borderRadius: rounded.lg,
    padding: 16,
  },
  trialText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.amber.text,
  },
});
