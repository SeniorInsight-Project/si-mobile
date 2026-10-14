import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import InviteMemberModal from '../components/InviteMemberModal';
import Icon from '../components/Icon';
import {
  listarMembrosRede,
  gerarConvite,
  listarConvitesPendentes,
  cancelarConvite,
  editarConvite,
  INITIAL_MEMBERS,
} from '../services/redeProtecaoService';
import { typography } from '../theme';

const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function FamilyScreen({ onNavigate, idosoId = DEFAULT_IDOSO_ID }) {
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [membros, setMembros] = useState(INITIAL_MEMBERS);
  const [convitesPendentes, setConvitesPendentes] = useState([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [modalInviteVisible, setModalInviteVisible] = useState(false);
  const [conviteParaEditar, setConviteParaEditar] = useState(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);

  const carregarDados = async () => {
    try {
      setCarregandoMembros(true);
      const [listaMembros, listaPendentes] = await Promise.all([
        listarMembrosRede(idosoId),
        listarConvitesPendentes(idosoId),
      ]);
      if (Array.isArray(listaMembros) && listaMembros.length > 0) {
        setMembros(listaMembros);
      }
      if (Array.isArray(listaPendentes)) {
        setConvitesPendentes(listaPendentes);
      }
    } catch (err) {
      console.warn('[FamilyScreen] Erro ao carregar dados:', err.message);
    } finally {
      setCarregandoMembros(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [idosoId]);

  const totalMembros = membros.length;
  const totalProximos = membros.filter(
    (m) => (m.categoria || '').toLowerCase() === 'proximos'
  ).length;
  const totalSaude = membros.filter(
    (m) => (m.categoria || '').toLowerCase() === 'saude'
  ).length;
  const totalPendentes = convitesPendentes.length;

  // Limite da RN-012: até 5 familiares
  const totalFamiliares = membros.filter(
    (m) => m.papelAcesso !== 'MEDICO' && m.badgeTipo !== 'especialista'
  ).length;
  const limiteAtingido = totalFamiliares >= 5;

  const membroPlantao =
    membros.find((m) => m.isPlantao || m.badgeTipo === 'plantao') || membros[0];

  const membrosFiltrados = membros.filter((m) => {
    const cat = (m.categoria || '').toLowerCase();
    if (filtroAtivo === 'Todos') return true;
    if (filtroAtivo === 'Proximos') return cat === 'proximos';
    if (filtroAtivo === 'Saude') return cat === 'saude';
    return true;
  });

  const handleConvidar = () => {
    if (limiteAtingido) {
      Alert.alert(
        'Limite de Familiares',
        'Limite de 5 familiares atingido. Para convidar outro membro, remova um familiar existente.'
      );
      return;
    }
    setConviteParaEditar(null);
    setModalInviteVisible(true);
  };

  const handleEnviarConvite = async (dadosConvite) => {
    try {
      setSubmittingInvite(true);
      const resultado = await gerarConvite(idosoId, dadosConvite);
      await carregarDados();
      return resultado;
    } catch (err) {
      Alert.alert('Erro ao Enviar Convite', err.message || 'Não foi possível enviar o convite.');
      throw err;
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleEditarConvite = (convite) => {
    setConviteParaEditar(convite);
    setModalInviteVisible(true);
  };

  const handleSalvarEdicaoConvite = async (conviteId, novosDados) => {
    try {
      await editarConvite(idosoId, conviteId, novosDados);
      await carregarDados();
      Alert.alert('Sucesso', 'Informações do convite atualizadas.');
    } catch (err) {
      Alert.alert('Erro', err.message || 'Não foi possível atualizar o convite.');
    }
  };

  const handleCancelarConvite = (convite) => {
    Alert.alert(
      'Cancelar Convite',
      `Deseja realmente cancelar o convite enviado para ${convite.emailDestinatario}? O link de acesso deixará de funcionar imediatamente.`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelarConvite(idosoId, convite.id);
              await carregarDados();
              Alert.alert('Convite Cancelado', 'O convite foi cancelado e removido.');
            } catch (err) {
              Alert.alert('Erro', 'Não foi possível cancelar o convite.');
            }
          },
        },
      ]
    );
  };

  const handleCompartilharConvite = async (convite) => {
    try {
      const link = convite.linkConvite || `seniorinsight://convite/${convite.token}`;
      await Share.share({
        title: 'Convite para Rede de Cuidados SeniorInsight',
        message: `Olá! Você foi convidado para a Rede de Cuidados de ${convite.nomeIdoso || 'Dona Maria Silva'} no SeniorInsight.\n\nToque no link seguro para aceitar o convite: ${link}\n\n(Válido por 48 horas)`,
        url: link,
      });
    } catch (err) {
      Alert.alert('Erro ao compartilhar', err.message);
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
            <View style={styles.activeMembersPill}>
              <Text style={styles.activeMembersText}>
                {carregandoMembros ? 'Atualizando...' : `${totalMembros} Membros Ativos`}
              </Text>
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
                Plantão Atual: {membroPlantao?.nome || 'Carlos Silva'}
              </Text>
              <Text style={styles.onDutySub}>
                {membroPlantao?.statusLabel || 'Resposta rápida estimada em 4 min'}
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
              Todos ({totalMembros})
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
              Próximos ({totalProximos})
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
              Saúde ({totalSaude})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filtroAtivo === 'Pendentes' && styles.filterPillActive,
            ]}
            onPress={() => setFiltroAtivo('Pendentes')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterPillText,
                filtroAtivo === 'Pendentes' && styles.filterPillTextActive,
              ]}
            >
              Pendentes ({totalPendentes})
            </Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE CARDS (MEMBROS ATIVOS OU CONVITES PENDENTES) */}
        {filtroAtivo === 'Pendentes' ? (
          <View style={styles.membersList}>
            {convitesPendentes.length === 0 ? (
              <View style={styles.emptyPendingCard}>
                <View style={styles.emptyPendingIconCircle}>
                  <Icon name="mail" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyPendingTitle}>Nenhum Convite Pendente</Text>
                <Text style={styles.emptyPendingSubtitle}>
                  Todos os convites enviados foram aceitos ou expiraram. Toque no botão abaixo para convidar um novo familiar.
                </Text>
              </View>
            ) : (
              convitesPendentes.map((convite) => (
                <View key={convite.id} style={styles.pendingInviteCard}>
                  {/* Topo do card: Avatar + Email + Status */}
                  <View style={styles.pendingHeaderRow}>
                    <View style={styles.pendingAvatarWrapper}>
                      <View style={styles.pendingAvatar}>
                        <Icon name="mail" size={20} color="#0284C7" />
                      </View>
                    </View>

                    <View style={styles.pendingHeaderInfo}>
                      <Text style={styles.pendingName} numberOfLines={1}>
                        {convite.emailDestinatario}
                      </Text>
                      <Text style={styles.pendingSubtitle}>
                        {convite.grauParentescoSugerido} • {convite.papelLabel || 'Cuidador(a)'}
                      </Text>
                    </View>

                    <View style={styles.pendingStatusBadge}>
                      <Icon name="schedule" size={11} color="#B45309" style={{ marginRight: 3 }} />
                      <Text style={styles.pendingStatusText}>Aguardando</Text>
                    </View>
                  </View>

                  {/* Detalhes de Expiração */}
                  <View style={styles.pendingInfoRow}>
                    <Icon name="hourglass_top" size={13} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.pendingInfoText}>
                      Expira em {convite.validadeHorasRestantes || 48}h • Link de uso único
                    </Text>
                  </View>

                  {/* Ações: Editar, Reenviar Link e Cancelar */}
                  <View style={styles.pendingActionsRow}>
                    <TouchableOpacity
                      style={styles.pendingBtnEdit}
                      onPress={() => handleEditarConvite(convite)}
                      activeOpacity={0.8}
                    >
                      <Icon name="edit" size={14} color="#031753" style={{ marginRight: 4 }} />
                      <Text style={styles.pendingBtnEditText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pendingBtnShare}
                      onPress={() => handleCompartilharConvite(convite)}
                      activeOpacity={0.8}
                    >
                      <Icon name="share" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                      <Text style={styles.pendingBtnShareText}>Reenviar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pendingBtnCancel}
                      onPress={() => handleCancelarConvite(convite)}
                      activeOpacity={0.8}
                    >
                      <Icon name="delete" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.pendingBtnCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
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
      )}

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
        style={[
          styles.inviteCtaButton,
          limiteAtingido && styles.inviteCtaButtonDisabled,
        ]}
        onPress={handleConvidar}
        activeOpacity={0.85}
      >
        <Icon name="person_add" size={20} color="#FFFFFF" />
        <Text style={styles.inviteCtaText}>
          {limiteAtingido ? 'Limite de 5 Familiares Atingido' : 'Convidar Novo Membro'}
        </Text>
      </TouchableOpacity>
    </ScrollView>

    {/* MODAL DE CONVITE / EDIÇÃO DE NOVO MEMBRO (HU16) */}
    <InviteMemberModal
      visible={modalInviteVisible}
      conviteParaEditar={conviteParaEditar}
      onClose={() => {
        setModalInviteVisible(false);
        setConviteParaEditar(null);
      }}
      onSendInvite={handleEnviarConvite}
      onEditInvite={handleSalvarEdicaoConvite}
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
  inviteCtaButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: '#94A3B8',
    shadowOpacity: 0.1,
  },
  pendingInviteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 4,
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingAvatarWrapper: {
    marginRight: 12,
  },
  pendingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  pendingName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  pendingSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  pendingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  pendingInfoText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  pendingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBtnEdit: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBtnEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
  },
  pendingBtnShare: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBtnShareText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  pendingBtnCancel: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBtnCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyPendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  emptyPendingIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyPendingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyPendingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});