import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { typography } from '../theme';

export interface RescueCommandCardProps {
  onAssumirResgate?: () => void;
  onVerContatos?: () => void;
  resgateAtivo?: boolean;
  responsavelNome?: string;
}

export default function RescueCommandCard({
  onAssumirResgate,
  onVerContatos,
  resgateAtivo = false,
  responsavelNome = '',
}: RescueCommandCardProps) {
  return (
    <View style={styles.cardContainer}>
      {/* Cabeçalho do Módulo */}
      <View style={styles.headerRow}>
        <View style={styles.shieldIconWrapper}>
          <Icon name="shield_alert" size={18} color="#B51C13" />
        </View>
        <Text style={styles.cardTitle}>Comando de Resgate Familiar</Text>
      </View>

      <Text style={styles.cardDescription}>
        Em caso de alarme ou perda de contato, assuma o protocolo para notificar
        todos os familiares e os serviços médicos de emergência.
      </Text>

      {/* Botão Primário "Estou Assumindo o Resgate" (height 84, rx=32, #031753) */}
      <TouchableOpacity
        style={[
          styles.rescueButton,
          resgateAtivo && styles.rescueButtonActive,
        ]}
        onPress={onAssumirResgate}
        activeOpacity={0.85}
      >
        <View style={styles.rescueIconCircle}>
          <Icon name="emergency" size={22} color="#FFFFFF" />
        </View>

        <View style={styles.rescueButtonTexts}>
          <Text style={styles.rescueButtonTitle}>
            {resgateAtivo
              ? 'Resgate em Andamento'
              : 'Estou Assumindo o\nResgate'}
          </Text>
          <Text style={styles.rescueButtonSubtitle}>
            {resgateAtivo
              ? `Assumido por ${responsavelNome || 'você'} • Protocolo Ativo`
              : 'Dispara alerta prioritário no celular do idoso'}
          </Text>
        </View>

        <Icon name="chevron_right" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Caregivers Quick Presence Row (rx=32, #F5F7FA) */}
      <TouchableOpacity
        style={styles.presencePillRow}
        onPress={onVerContatos}
        activeOpacity={0.8}
      >
        <View style={styles.presenceLeft}>
          <Text style={styles.redeAtentaLabel}>Rede Atenta:</Text>
          <View style={styles.avatarGroup}>
            <View
              style={[
                styles.caregiverAvatar,
                { backgroundColor: '#031753', justifyContent: 'center', alignItems: 'center' },
              ]}
            >
              <Text style={styles.caregiverInitials}>CS</Text>
            </View>
            <View
              style={[
                styles.caregiverAvatar,
                styles.avatarOverlap,
                { backgroundColor: '#003B26', justifyContent: 'center', alignItems: 'center' },
              ]}
            >
              <Text style={styles.caregiverInitials}>RS</Text>
            </View>
            <View
              style={[
                styles.caregiverAvatar,
                styles.avatarOverlap,
                { backgroundColor: '#B51C13', justifyContent: 'center', alignItems: 'center' },
              ]}
            >
              <Text style={styles.caregiverInitials}>JC</Text>
            </View>
          </View>
        </View>

        <Text style={styles.onlineStatusText}>3 Cuidadores Online</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  shieldIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 16,
    fontFamily: typography.fontFamily.body,
  },
  rescueButton: {
    backgroundColor: '#031753',
    borderRadius: 32,
    minHeight: 84,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  rescueButtonActive: {
    backgroundColor: '#B51C13',
  },
  rescueIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D83729',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rescueButtonTexts: {
    flex: 1,
    paddingRight: 8,
  },
  rescueButtonTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 3,
    fontFamily: typography.fontFamily.heading,
  },
  rescueButtonSubtitle: {
    color: '#B7C4FF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    fontFamily: typography.fontFamily.body,
  },
  presencePillRow: {
    height: 44,
    borderRadius: 32,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redeAtentaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 8,
    fontFamily: typography.fontFamily.body,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caregiverAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  caregiverInitials: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  onlineStatusText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
});
