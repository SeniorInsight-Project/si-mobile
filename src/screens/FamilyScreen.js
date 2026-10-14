import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import InviteMemberModal from '../components/InviteMemberModal';
import Icon from '../components/Icon';
import { gerarConvite } from '../services/redeProtecaoService';
import { typography } from '../theme';

const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

const MEMBROS_REDE = [
  {
    id: '1',
    nome: 'Carlos Silva',
    iniciais: 'CS',
    avatarBg: '#EBF5FF',
    avatarCor: '#031753',
    subtitulo: 'Filho • A 1.2 km de distância',
    categoria: 'Proximos',
    badgeTexto: 'Plantão',
    badgeBg: '#E8F8F0',
    badgeCor: '#003B26',
    online: true,
    infoIcon: 'notifications',
    infoTexto: 'Recebe alertas SOS críticos',
    infoDestaque: true,
    acoes: ['call_primary', 'whatsapp_primary', 'history'],
  },
  {
    id: '2',
    nome: 'Roberta Santos',
    iniciais: 'RS',
    avatarBg: '#E8F8F0',
    avatarCor: '#003B26',
    subtitulo: 'Filha • A 3.8 km de distância',
    categoria: 'Proximos',
    badgeTexto: 'Família',
    badgeBg: '#EBF5FF',
    badgeCor: '#2D418A',
    online: true,
    infoIcon: 'medication',
    infoTexto: 'Notificações de medicação ativas',
    infoDestaque: false,
    acoes: ['call', 'whatsapp'],
  },
  {
    id: '3',
    nome: 'Lucas Silva',
    iniciais: 'LS',
    avatarBg: '#F2F4F7',
    avatarCor: '#475467',
    subtitulo: 'Neto • A 8.5 km de distância',
    categoria: 'Todos',
    badgeTexto: 'Apoio',
    badgeBg: '#F2F4F7',
    badgeCor: '#64748B',
    online: false,
    infoIcon: 'schedule',
    infoTexto: 'Contato secundário de fim de semana',
    infoDestaque: false,
    acoes: ['call', 'whatsapp'],
  },
  {
    id: '4',
    nome: 'Enfª Juliana Costa',
    iniciais: 'JC',
    avatarBg: '#FFEBE7',
    avatarCor: '#B51C13',
    subtitulo: 'Cuidadora Diurna • Turno Seg–Sex',
    categoria: 'Saude',
    badgeTexto: 'Especialista',
    badgeBg: '#FFEBE7',
    badgeCor: '#B51C13',
    online: true,
    infoIcon: 'assignment',
    infoTexto: 'Acesso ao prontuário e rotina',
    infoDestaque: false,
    acoes: ['call', 'prontuario'],
  },
];

export default function FamilyScreen({ onNavigate, idosoId = DEFAULT_IDOSO_ID }) {
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [modalInviteVisible, setModalInviteVisible] = useState(false);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  const membrosFiltrados = MEMBROS_REDE.filter((m) => {
    if (filtroAtivo === 'Todos') return true;
    if (filtroAtivo === 'Proximos') return m.categoria === 'Proximos';
    if (filtroAtivo === 'Saude') return m.categoria === 'Saude';
    return true;
  });

  const handleConvidar = () => {
    setModalInviteVisible(true);
  };

  const handleEnviarConvite = async (dadosConvite) => {
    try {
      setSubmittingInvite(true);
      await gerarConvite(idosoId, dadosConvite);
      setModalInviteVisible(false);
      Alert.alert(
        'Convite Enviado',
        `Um convite seguro (válido por 48h) foi enviado para ${dadosConvite.email}.`
      );
    } catch (err) {
      Alert.alert('Erro', err.message || 'Não foi possível enviar o convite.');
    } finally {
      setSubmittingInvite(false);
    }
  };

  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO */}
      <AppHeader
        title="Família Perfil"
        subtitle="CUIDADO ATIVO"
        onNavigate={onNavigate}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD 1: RESUMO DA REDE DE CUIDADO FAMILIAR (rx=32, #FFFFFF) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.circleConnectedRow}>
              <View style={styles.connectedDot} />
              <Text style={styles.circleConnectedLabel}>CÍRCULO CONECTADO</Text>
            </View>
            <View style={styles.activeMembersPill}>
              <Text style={styles.activeMembersText}>4 Membros Ativos</Text>
            </View>
          </View>

          <Text style={styles.summaryTitle}>Rede de Cuidado Familiar</Text>
          <Text style={styles.summarySubtitle}>
            Pessoas autorizadas para alertas SOS e acompanhamento diário de Dona
            Maria.
          </Text>

          {/* Caixa Azul de Plantão Atual (#EBF5FF, rx=20) */}
          <TouchableOpacity
            style={styles.onDutyBox}
            onPress={() => onNavigate && onNavigate('ElderlyProfile')}
            activeOpacity={0.85}
          >
            <View style={styles.onDutyIconCircle}>
              <Icon name="shield_check" size={18} color="#031753" />
            </View>
            <View style={styles.onDutyTexts}>
              <Text style={styles.onDutyTitle}>
                Plantão Atual: Carlos Silva
              </Text>
              <Text style={styles.onDutySub}>
                Resposta rápida estimada em 4 min
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* PÍLULAS DE FILTRO */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              filtroAtivo === 'Todos' && styles.filterPillActive,
            ]}
            onPress={() => setFiltroAtivo('Todos')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                filtroAtivo === 'Todos' && styles.filterPillTextActive,
              ]}
            >
              Todos (4)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filtroAtivo === 'Proximos' && styles.filterPillActive,
            ]}
            onPress={() => setFiltroAtivo('Proximos')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                filtroAtivo === 'Proximos' && styles.filterPillTextActive,
              ]}
            >
              Próximos (2)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filtroAtivo === 'Saude' && styles.filterPillActive,
            ]}
            onPress={() => setFiltroAtivo('Saude')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                filtroAtivo === 'Saude' && styles.filterPillTextActive,
              ]}
            >
              Saúde (1)
            </Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE CARDS DOS MEMBROS */}
        <View style={styles.membersList}>
          {membrosFiltrados.map((membro) => (
            <View key={membro.id} style={styles.memberCard}>
              {/* Topo do Card: Avatar + Nome + Badge de Papel */}
              <View style={styles.memberHeaderRow}>
                <View style={styles.memberHeaderLeft}>
                  <View style={styles.avatarWrapper}>
                    <View
                      style={[
                        styles.memberAvatar,
                        {
                          backgroundColor: membro.avatarBg,
                          borderColor: membro.online ? '#E8F8F0' : '#F2F4F7',
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: membro.avatarCor,
                        }}
                      >
                        {membro.iniciais}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.presenceDot,
                        {
                          backgroundColor: membro.online
                            ? '#10B981'
                            : '#CBD5E1',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.memberTexts}>
                    <Text style={styles.memberName}>{membro.nome}</Text>
                    <Text style={styles.memberSub}>{membro.subtitulo}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: membro.badgeBg },
                  ]}
                >
                  <Text
                    style={[styles.roleBadgeText, { color: membro.badgeCor }]}
                  >
                    {membro.badgeTexto}
                  </Text>
                </View>
              </View>

              {/* Barra Inferior Cinza (#F2F4F7, rx=20) com Ações Rápidas */}
              <View style={styles.memberBottomBar}>
                <View style={styles.memberInfoLeft}>
                  <Icon
                    name={membro.infoIcon}
                    size={15}
                    color={membro.infoDestaque ? '#031753' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.memberInfoText,
                      membro.infoDestaque && styles.memberInfoTextHighlight,
                    ]}
                    numberOfLines={1}
                  >
                    {membro.infoTexto}
                  </Text>
                </View>

                <View style={styles.memberActionsRight}>
                  {membro.acoes.map((acao) => {
                    if (acao === 'call_primary') {
                      return (
                        <TouchableOpacity
                          key={acao}
                          style={[
                            styles.actionCircle,
                            { backgroundColor: '#10B981' },
                          ]}
                          onPress={() =>
                            Alert.alert(
                              'Ligar',
                              `Chamando ${membro.nome}...`
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Icon name="call" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      );
                    }
                    if (acao === 'whatsapp_primary') {
                      return (
                        <TouchableOpacity
                          key={acao}
                          style={[
                            styles.actionCircle,
                            { backgroundColor: '#2D418A' },
                          ]}
                          onPress={() =>
                            Alert.alert(
                              'WhatsApp',
                              `Abrindo conversa com ${membro.nome}...`
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Icon name="chat" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      );
                    }
                    if (acao === 'history') {
                      return (
                        <TouchableOpacity
                          key={acao}
                          style={styles.actionCircleWhite}
                          onPress={() =>
                            Alert.alert(
                              'Histórico de Plantão',
                              `Exibindo registros de atendimento de ${membro.nome}.`
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Icon name="history" size={16} color="#031753" />
                        </TouchableOpacity>
                      );
                    }
                    if (acao === 'call') {
                      return (
                        <TouchableOpacity
                          key={acao}
                          style={styles.actionCircleWhite}
                          onPress={() =>
                            Alert.alert(
                              'Ligar',
                              `Chamando ${membro.nome}...`
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Icon name="call" size={16} color="#059669" />
                        </TouchableOpacity>
                      );
                    }
                    if (acao === 'whatsapp') {
                      return (
                        <TouchableOpacity
                          key={acao}
                          style={styles.actionCircleWhite}
                          onPress={() =>
                            Alert.alert(
                              'WhatsApp',
                              `Abrindo conversa com ${membro.nome}...`
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Icon name="chat" size={16} color="#2D418A" />
                        </TouchableOpacity>
                      );
                    }
                    if (acao === 'prontuario') {
                      return (
                        <TouchableOpacity
                          key={acao}
                          style={styles.actionCircleWhite}
                          onPress={() =>
                            onNavigate && onNavigate('ElderlyProfile')
                          }
                          activeOpacity={0.8}
                        >
                          <Icon name="assignment" size={16} color="#031753" />
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* CARD DE SEQUÊNCIA DE CHAMADA SOS (#FFF1EC, rx=28) */}
        <TouchableOpacity
          style={styles.sosSequenceCard}
          onPress={() => onNavigate && onNavigate('EmergencyContacts')}
          activeOpacity={0.85}
        >
          <View style={styles.sosSequenceIconCircle}>
            <Icon name="crisis_alert" size={18} color="#B51C13" />
          </View>
          <View style={styles.sosSequenceTexts}>
            <Text style={styles.sosSequenceTitle}>
              Sequência de Chamada SOS
            </Text>
            <Text style={styles.sosSequenceSub}>
              Em caso de alarme: Carlos → Roberta → Lucas → SAMU 192
            </Text>
          </View>
        </TouchableOpacity>

        {/* BOTÃO PRIMÁRIO: CONVIDAR NOVO MEMBRO (#D83729, height 56, rx=28) */}
        <TouchableOpacity
          style={styles.inviteCtaButton}
          onPress={handleConvidar}
          activeOpacity={0.85}
        >
          <Icon name="person_add" size={20} color="#FFFFFF" />
          <Text style={styles.inviteCtaText}>Convidar Novo Membro</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL DE CONVITE DE NOVO MEMBRO (HU16) */}
      <InviteMemberModal
        visible={modalInviteVisible}
        onClose={() => setModalInviteVisible(false)}
        onSendInvite={handleEnviarConvite}
        loading={submittingInvite}
      />

      {/* BARRA INFERIOR DE NAVEGAÇÃO */}
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 105,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  circleConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  circleConnectedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.4,
    fontFamily: typography.fontFamily.heading,
  },
  activeMembersPill: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  activeMembersText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003B26',
    fontFamily: typography.fontFamily.heading,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#131E3D',
    marginBottom: 4,
    fontFamily: typography.fontFamily.heading,
  },
  summarySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 16,
    fontFamily: typography.fontFamily.body,
  },
  onDutyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    borderRadius: 20,
    padding: 12,
    gap: 12,
  },
  onDutyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onDutyTexts: {
    flex: 1,
  },
  onDutyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#031753',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  onDutySub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E2E69',
    fontFamily: typography.fontFamily.body,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  filterPillActive: {
    backgroundColor: '#031753',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: typography.fontFamily.heading,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  membersList: {
    gap: 14,
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 16,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  memberHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  memberHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberTexts: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#131E3D',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  memberSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: typography.fontFamily.heading,
  },
  memberBottomBar: {
    height: 52,
    backgroundColor: '#F2F4F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    paddingRight: 8,
  },
  memberInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
    fontFamily: typography.fontFamily.body,
  },
  memberInfoTextHighlight: {
    color: '#131E3D',
    fontWeight: '700',
  },
  memberActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCircleWhite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sosSequenceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF1EC',
    borderRadius: 28,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  sosSequenceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosSequenceTexts: {
    flex: 1,
  },
  sosSequenceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B51C13',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  sosSequenceSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 16,
    fontFamily: typography.fontFamily.body,
  },
  inviteCtaButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D83729',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#D83729',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  inviteCtaText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
});