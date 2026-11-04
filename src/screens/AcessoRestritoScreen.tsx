import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import { typography } from '../theme';

export interface AcessoRestritoScreenProps {
  onLogout: () => void;
}

/** Usuário autenticado sem o papel familiar ou idoso (médico, gestor, admin). */
export default function AcessoRestritoScreen({ onLogout }: AcessoRestritoScreenProps) {
  return (
    <ScreenWrapper hasHeader={false}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Icon name="shield" size={40} color="#2D418A" />
          <Text style={styles.title}>App exclusivo para família e idoso</Text>
          <Text style={styles.message}>
            Sua conta não tem acesso ao aplicativo. Médicos e gestores usam o portal web do SeniorInsight.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onLogout} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.buttonText}>Sair</Text>
          </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#131E3D',
    textAlign: 'center',
    fontFamily: typography.fontFamily.heading,
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: typography.fontFamily.body,
  },
  button: {
    marginTop: 8,
    height: 52,
    alignSelf: 'stretch',
    borderRadius: 9999,
    backgroundColor: '#D83729',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
});
