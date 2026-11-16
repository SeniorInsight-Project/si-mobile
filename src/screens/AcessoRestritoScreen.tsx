import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, font, rounded, shadows, typography } from '../theme';

export interface AcessoRestritoScreenProps {
  onLogout: () => void;
}

/** Usuário autenticado sem o papel familiar ou idoso (médico, gestor, admin). */
export default function AcessoRestritoScreen({ onLogout }: AcessoRestritoScreenProps) {
  return (
    <ScreenWrapper hasHeader={false}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Icon name="shield" size={40} color={colors.primaryNavy} />
          <Text style={styles.title}>App exclusivo para família e idoso</Text>
          <Text style={styles.message}>
            Sua conta não tem acesso ao aplicativo. Médicos e gestores usam o portal web do SeniorInsight.
          </Text>
          <View style={styles.buttonWrapper}>
            <Button
              title="Sair"
              onPress={onLogout}
              variant="primary"
              size="lg"
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    ...shadows.tier2,
  },
  title: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    ...font('body', 400),
  },
  buttonWrapper: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
});
