import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { ShieldAlert, Siren, ChevronRight, Users } from 'lucide-react-native';

export default function RescueCommandCard({
  onAssumirResgate,
  onVerContatos,
  resgateAtivo = false,
  responsavelNome = '',
}) {
  return (
    <View style={styles.cardContainer}>
      {/* Cabeçalho do Módulo */}
      <View style={styles.headerRow}>
        <View style={styles.shieldIconWrapper}>
          <ShieldAlert size={20} color="#DC2626" />
        </View>
        <Text style={styles.cardTitle}>Comando de Resgate Familiar</Text>
      </View>

      <Text style={styles.cardDescription}>
        Em caso de alarme ou perda de contato, assuma o protocolo para notificar
        todos os familiares e os serviços médicos de emergência.
      </Text>

      {/* Botão Primário "Estou Assumindo o Resgate" */}
      <TouchableOpacity
        style={[
          styles.rescueButton,
          resgateAtivo && styles.rescueButtonActive,
        ]}
        onPress={onAssumirResgate}
        activeOpacity={0.85}
      >
        <View style={styles.rescueIconCircle}>
          <Siren size={22} color="#FFFFFF" strokeWidth={2.5} />
        </View>

        <View style={styles.rescueButtonTexts}>
          <Text style={styles.rescueButtonTitle}>
            {resgateAtivo ? 'Resgate em Andamento' : 'Estou Assumindo o Resgate'}
          </Text>
          <Text style={styles.rescueButtonSubtitle}>
            {resgateAtivo
              ? `Assumido por ${responsavelNome || 'você'} • Protocolo Ativo`
              : 'Dispara alerta prioritário no celular do idoso'}
          </Text>
        </View>

        <ChevronRight size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Rodapé com Cuidadores Online e Atalho de Contatos */}
      <View style={styles.footerRow}>
        <View style={styles.caregiversInfo}>
          <Text style={styles.redeAtentaLabel}>Rede Atenta:</Text>
          <View style={styles.avatarGroup}>
            <View style={[styles.avatarDot, { backgroundColor: '#EBF5FF' }]}>
              <Text style={[styles.avatarText, { color: '#1E40AF' }]}>CA</Text>
            </View>
            <View style={[styles.avatarDot, { backgroundColor: '#E6F4EA', marginLeft: -8 }]}>
              <Text style={[styles.avatarText, { color: '#137333' }]}>RO</Text>
            </View>
            <View style={[styles.avatarDot, { backgroundColor: '#F3E8FF', marginLeft: -8 }]}>
              <Text style={[styles.avatarText, { color: '#6B21A8' }]}>DR</Text>
            </View>
          </View>
          <Text style={styles.onlineStatusText}>3 Cuidadores Online</Text>
        </View>
      </View>

      {/* Atalho para Lista de Socorristas & Contatos de Emergência */}
      <TouchableOpacity
        style={styles.contactsShortcut}
        onPress={onVerContatos}
        activeOpacity={0.8}
      >
        <Users size={15} color="#031753" />
        <Text style={styles.contactsShortcutText}>
          Lista de Socorristas &amp; Contatos (3)
        </Text>
        <ChevronRight size={14} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shieldIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#031753',
  },
  cardDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  rescueButton: {
    backgroundColor: '#0A194E', // Azul escuro profundo do template
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#0A194E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  rescueButtonActive: {
    backgroundColor: '#991B1B', // Vermelho quando ativo
  },
  rescueIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rescueButtonTexts: {
    flex: 1,
  },
  rescueButtonTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  rescueButtonSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  caregiversInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redeAtentaLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 8,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '700',
  },
  onlineStatusText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },
  contactsShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    justifyContent: 'space-between',
  },
  contactsShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
    flex: 1,
    marginLeft: 6,
  },
});
