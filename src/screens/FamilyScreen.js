import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import BottomNavBar from '../components/BottomNavBar';
import FamilyMemberCard from '../components/FamilyMemberCard';
import InviteMemberModal from '../components/InviteMemberModal';
import {
  listarMembrosRede,
  gerarConvite,
  INITIAL_MEMBERS,
  SOS_CALL_SEQUENCE,
} from '../services/redeProtecaoService.js';

// ID padrão para desenvolvimento e testes
const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function FamilyScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
}) {
  const [membros, setMembros] = useState(INITIAL_MEMBERS);
  const [activeFilter, setActiveFilter] = useState('todos'); // 'todos' | 'proximos' | 'saude'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalInviteVisible, setModalInviteVisible] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Carrega os membros da rede
  const carregarMembros = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await listarMembrosRede(idosoId);
      if (data && Array.isArray(data)) {
        setMembros(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar membros da rede:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarMembros();
  }, [idosoId]);

  // Contagens para os filtros
  const { todosCount, proximosCount, saudeCount, membroDePlantao } = useMemo(() => {
    const todos = membros.length;
    const proximos = membros.filter((m) => m.categoria === 'proximos').length;
    const saude = membros.filter((m) => m.categoria === 'saude').length;
    const plantao = membros.find((m) => m.isPlantao || m.badgeTipo === 'plantao') || membros[0];
    return {
      todosCount: todos,
      proximosCount: proximos,
      saudeCount: saude,
      membroDePlantao: plantao,
    };
  }, [membros]);

  // Membros filtrados pela aba selecionada
  const membrosFiltrados = useMemo(() => {
    if (activeFilter === 'proximos') {
      return membros.filter((m) => m.categoria === 'proximos');
    }
    if (activeFilter === 'saude') {
      return membros.filter((m) => m.categoria === 'saude');
    }
    return membros;
  }, [membros, activeFilter]);

  // Handler para envio de convite
  const handleSendInvite = async (dadosConvite) => {
    try {
      setSubmittingInvite(true);
      const resultado = await gerarConvite(idosoId, dadosConvite);

      setModalInviteVisible(false);

      Alert.alert(
        'Convite Enviado com Sucesso! ✉️',
        `Um e-mail foi disparado para ${dadosConvite.email} com o token de autorização temporal.\n\nValidade: 48 horas.\nPapel: ${dadosConvite.papelAcesso}.`,
        [{ text: 'Entendido' }]
      );

      // Recarrega a lista
      carregarMembros(true);
    } catch (err) {
      Alert.alert(
        'Erro ao Enviar Convite',
        err.message || 'Não foi possível gerar o convite temporal para este usuário.'
      );
    } finally {
      setSubmittingInvite(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => carregarMembros(true)}
            colors={['#031753']}
            tintColor="#031753"
          />
        }
      >
        {/* HEADER SUPERIOR IDÊNTICO AO FIGMA */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => onNavigate && onNavigate('Home')}
            activeOpacity={0.8}
            accessibilityLabel="Voltar para Início"
          >
            <Text style={styles.heartIcon}>♡</Text>
          </TouchableOpacity>

          <View style={styles.topTitleContainer}>
            <Text style={styles.topSubtitle}>CUIDADO ATIVO</Text>
            <Text style={styles.topMainTitle}>Família Perfil</Text>
          </View>

          <View style={styles.topRightIcons}>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Notificações', 'Círculo familiar ativo. Sem novos chamados pendentes.')}
              accessibilityLabel="Notificações"
            >
              <Text style={styles.bellIcon}>🔔</Text>
              <View style={styles.redDotNotification} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileHeaderButton}
              onPress={() => onNavigate && onNavigate('ElderlyProfile')}
              activeOpacity={0.8}
              accessibilityLabel="Ir para Perfil do Idoso"
            >
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoHeaderImg}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* CARD PRINCIPAL: CÍRCULO CONECTADO & PLANTÃO */}
        <View style={styles.circleHeaderCard}>
          <View style={styles.circleTopRow}>
            <View style={styles.circleConnectedBadge}>
              <View style={styles.connectedGreenDot} />
              <Text style={styles.circleConnectedText}>CÍRCULO CONECTADO</Text>
            </View>

            <View style={styles.membersCountPill}>
              <Text style={styles.membersCountText}>
                {membros.length} Membros Ativos
              </Text>
            </View>
          </View>

          <Text style={styles.circleCardTitle}>Rede de Cuidado Familiar</Text>

          {/* CAIXA DE PLANTÃO ATUAL */}
          <View style={styles.dutyHighlightBox}>
            <Text style={styles.dutyText}>
              Plantão Atual:{' '}
              <Text style={styles.dutyBoldText}>
                {membroDePlantao?.nomeCompleto || 'Carlos Silva'}
              </Text>{' '}
              • Resposta estimada em 4 min
            </Text>
          </View>
        </View>

        {/* FILTROS (PILL TABS) */}
        <View style={styles.filterTabsRow}>
          {/* TAB 1: TODOS */}
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'todos' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            onPress={() => setActiveFilter('todos')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'todos' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              👥 Todos ({todosCount})
            </Text>
          </TouchableOpacity>

          {/* TAB 2: PRÓXIMOS */}
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'proximos' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            onPress={() => setActiveFilter('proximos')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'proximos' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              <Text style={styles.checkIcon}>✔ </Text>
              Próximos ({proximosCount})
            </Text>
          </TouchableOpacity>

          {/* TAB 3: SAÚDE */}
          <TouchableOpacity
            style={[
              styles.filterTab,
              activeFilter === 'saude' ? styles.filterTabActive : styles.filterTabInactive,
            ]}
            onPress={() => setActiveFilter('saude')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === 'saude' ? styles.filterTabTextActive : styles.filterTabTextInactive,
              ]}
            >
              🏥 Saúde ({saudeCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE MEMBROS DA REDE */}
        {loading && membros.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#031753" />
            <Text style={styles.loadingText}>Carregando rede de proteção...</Text>
          </View>
        ) : (
          <View style={styles.membersListContainer}>
            {membrosFiltrados.map((member) => (
              <FamilyMemberCard
                key={member.id}
                member={member}
              />
            ))}

            {membrosFiltrados.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyTitle}>Nenhum membro encontrado</Text>
                <Text style={styles.emptySubtitle}>
                  Não há membros cadastrados nesta categoria de filtro.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* CARD: SEQUÊNCIA DE CHAMADA SOS */}
        <View style={styles.sosSequenceCard}>
          <View style={styles.sosIconCircle}>
            <Text style={styles.sosSymbolText}>☊</Text>
          </View>
          <View style={styles.sosInfoCol}>
            <Text style={styles.sosCardTitle}>Sequência de Chamada SOS</Text>
            <Text style={styles.sosChainText}>
              Em caso de alarme:{' '}
              <Text style={styles.sosChainHighlight}>
                {SOS_CALL_SEQUENCE.join(' → ')}
              </Text>
            </Text>
          </View>
        </View>

        {/* BOTÃO PRINCIPAL: CONVIDAR NOVO MEMBRO */}
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setModalInviteVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.inviteButtonIcon}>👤 </Text>
          <Text style={styles.inviteButtonText}>Convidar Novo Membro</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DE CONVITE TEMPORAL DE 48H */}
      <InviteMemberModal
        visible={modalInviteVisible}
        onClose={() => setModalInviteVisible(false)}
        onSendInvite={handleSendInvite}
        loading={submittingInvite}
      />

      {/* BARRA INFERIOR DE NAVEGAÇÃO COM ABA FAMÍLIA ATIVA */}
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100, // Espaço para a barra inferior
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  heartIcon: {
    fontSize: 22,
    color: '#031753',
  },
  topTitleContainer: {
    alignItems: 'center',
  },
  topSubtitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  topMainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#031753',
    marginTop: 2,
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  bellIcon: {
    fontSize: 18,
  },
  redDotNotification: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  logoHeaderImg: {
    width: 26,
    height: 26,
  },
  circleHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  circleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  circleConnectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  circleConnectedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  membersCountPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membersCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  circleCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  dutyHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  dutyIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#1E40AF',
  },
  dutyText: {
    flex: 1,
    fontSize: 12,
    color: '#1E3A8A',
    lineHeight: 18,
  },
  dutyBoldText: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#0B1941',
  },
  filterTabInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabTextInactive: {
    color: '#475569',
  },
  checkIcon: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  membersListContainer: {
    marginBottom: 14,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  sosSequenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sosIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosSymbolText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sosInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  sosCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  sosChainText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  sosChainHighlight: {
    fontWeight: '600',
    color: '#0F172A',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 28,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  inviteButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});