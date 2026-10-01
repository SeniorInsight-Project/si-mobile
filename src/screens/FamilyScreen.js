import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Users,
  Shield,
  Heart,
  Phone,
  ChevronRight,
  UserPlus,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';

const FAMILIARES_PADRAO = [
  {
    id: '1',
    nome: 'Carlos Silva',
    parentesco: 'Filho • Cuidador Principal',
    status: 'Online agora',
    corStatus: '#16A34A',
    avatar: 'CS',
    corAvatar: '#E0F2FE',
    corTexto: '#0284C7',
    telefone: '(11) 98765-4321',
    permissoes: 'Acesso Total',
  },
  {
    id: '2',
    nome: 'Roberta Santos',
    parentesco: 'Filha • Cuidadora Secundária',
    status: 'Visto há 15 min',
    corStatus: '#64748B',
    avatar: 'RS',
    corAvatar: '#FCE7F3',
    corTexto: '#BE185D',
    telefone: '(11) 97654-3210',
    permissoes: 'Acompanhamento e SOS',
  },
  {
    id: '3',
    nome: 'Dr. Roberto Silva',
    parentesco: 'Médico Geriatra',
    status: 'Disponível em horário comercial',
    corStatus: '#0D9488',
    avatar: 'DR',
    corAvatar: '#E6FFFA',
    corTexto: '#0D9488',
    telefone: '(11) 91234-5678',
    permissoes: 'Relatórios e Emergência',
  },
];

export default function FamilyScreen({ onNavigate }) {
  const handleConvidar = () => {
    Alert.alert(
      'Convidar Cuidador',
      'Um link de convite seguro foi gerado para inclusão de novos familiares na rede de Dona Maria.'
    );
  };

  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO */}
      <AppHeader title="Rede Familiar" subtitle="CUIDADO ATIVO" onNavigate={onNavigate} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BANNER DE STATUS DA REDE */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryIconBadge}>
            <Users size={22} color="#0284C7" />
          </View>
          <View style={styles.summaryTexts}>
            <Text style={styles.summaryTitle}>Círculo de Cuidado Ativo</Text>
            <Text style={styles.summarySubtitle}>
              3 cuidadores conectados e sincronizados em tempo real com os sinais vitais e alarmes de Dona Maria.
            </Text>
          </View>
        </View>

        {/* ATALHO PARA ESCALONAMENTO DE EMERGÊNCIA (HU35) */}
        <TouchableOpacity
          style={styles.emergencyShortcutCard}
          onPress={() => onNavigate && onNavigate('EmergencyContacts')}
          activeOpacity={0.85}
        >
          <View style={styles.emergencyShortcutLeft}>
            <View style={styles.shortcutIconBadge}>
              <ShieldAlert size={20} color="#DC2626" />
            </View>
            <View>
              <Text style={styles.shortcutTitle}>Escalonamento de Socorro (SOS)</Text>
              <Text style={styles.shortcutSubtitle}>
                Definir prioridades de discagem e contatos imediatos
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* LISTA DE MEMBROS DA REDE */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Membros Conectados</Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={handleConvidar}
            activeOpacity={0.8}
          >
            <UserPlus size={14} color="#031753" style={{ marginRight: 4 }} />
            <Text style={styles.inviteButtonText}>Convidar</Text>
          </TouchableOpacity>
        </View>

        {FAMILIARES_PADRAO.map((membro) => (
          <View key={membro.id} style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: membro.corAvatar }]}>
                <Text style={[styles.avatarText, { color: membro.corTexto }]}>
                  {membro.avatar}
                </Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{membro.nome}</Text>
                <Text style={styles.memberRole}>{membro.parentesco}</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: membro.corStatus }]} />
                  <Text style={styles.statusText}>{membro.status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.memberDivider} />

            <View style={styles.memberFooter}>
              <View style={styles.permissionBadge}>
                <Shield size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.permissionText}>{membro.permissoes}</Text>
              </View>

              <Text style={styles.phoneText}>{membro.telefone}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* BARRA INFERIOR DE NAVEGAÇÃO */}
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  summaryTexts: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#031753',
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  emergencyShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  emergencyShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shortcutIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  shortcutSubtitle: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#031753',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  inviteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#031753',
  },
  memberRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  memberDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  memberFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  permissionText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  phoneText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
});