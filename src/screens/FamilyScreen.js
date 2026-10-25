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
import InviteDoctorModal from '../components/InviteDoctorModal';
import Icon from '../components/Icon';
import {
  listarMembrosRede,
  gerarConvite,
  gerarConviteMedico,
  recusarConvite,
  descartarConviteRecusado,
  listarConvitesPendentes,
  cancelarConvite,
  editarConvite,
  INITIAL_MEMBERS,
  LIMITE_MEDICOS_RN012,
  LIMITE_FAMILIARES_RN012,
} from '../services/redeProtecaoService';
import { typography } from '../theme';

const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function FamilyScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
  isFamiliarAdmin = true,
  papelAcesso = 'ADMIN',
}) {
  const isAdmin = Boolean(
    isFamiliarAdmin === true ||
    isFamiliarAdmin === 'true' ||
    String(papelAcesso || '').toUpperCase() === 'ADMIN' ||
    String(papelAcesso || '').toUpperCase() === 'ADMINISTRADOR'
  );
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [membros, setMembros] = useState(INITIAL_MEMBERS);
  const [convitesPendentes, setConvitesPendentes] = useState([]);
  const [carregandoMembros, setCarregandoMembros] = useState(false);
  const [modalInviteVisible, setModalInviteVisible] = useState(false);
  const [modalDoctorInviteVisible, setModalDoctorInviteVisible] = useState(false);
  const [conviteParaEditar, setConviteParaEditar] = useState(null);
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [submittingDoctorInvite, setSubmittingDoctorInvite] = useState(false);

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

  // Contagem e filtros de médicos e familiares (RN-012)
  const medicosVinculados = membros.filter(
    (m) => (m.papelAcesso === 'MEDICO' || m.tipoMembro === 'MEDICO') && (m.crm || m.grauParentesco === 'Médico' || m.grauParentesco === 'Médico(a)')
  );
  const convitesMedicosPendentes = convitesPendentes.filter(
    (c) => c.status === 'PENDENTE' && (c.papelAcessoSugerido === 'MEDICO' || c.crm || c.tipoMembro === 'MEDICO')
  );
  const convitesMedicosRecusados = convitesPendentes.filter(
    (c) => c.status === 'RECUSADO' && (c.papelAcessoSugerido === 'MEDICO' || c.crm || c.tipoMembro === 'MEDICO')
  );

  const totalMedicos = medicosVinculados.length + convitesMedicosPendentes.length;
  const limiteMedicosAtingido = totalMedicos >= LIMITE_MEDICOS_RN012;

  const totalFamiliares = membros.filter(
    (m) => m.papelAcesso !== 'MEDICO' && m.badgeTipo !== 'especialista'
  ).length;
  const limiteAtingido = totalFamiliares >= LIMITE_FAMILIARES_RN012;

  const totalMembros = membros.length;
  const totalProximos = membros.filter(
    (m) => (m.categoria || '').toLowerCase() === 'proximos'
  ).length;
  const totalSaude = membros.filter(
    (m) => (m.categoria || '').toLowerCase() === 'saude'
  ).length + convitesMedicosPendentes.length + convitesMedicosRecusados.length;
  const totalPendentes = convitesPendentes.length;

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

  const handleConvidarMedico = () => {
    if (!isAdmin) {
      Alert.alert(
        'Acesso Restrito',
        'Somente o Familiar Administrador tem permissão para convidar o médico do idoso.'
      );
      return;
    }
    if (limiteMedicosAtingido) {
      Alert.alert(
        'Limite de Médicos',
        'Limite de 2 médicos atingido'
      );
      return;
    }
    setModalDoctorInviteVisible(true);
  };

  const handleEnviarConviteMedico = async (dadosMedico) => {
    try {
      setSubmittingDoctorInvite(true);
      const resultado = await gerarConviteMedico(idosoId, dadosMedico, {
        papelUsuario: papelAcesso,
        isAdmin,
      });
      await carregarDados();
      return resultado;
    } catch (err) {
      Alert.alert('Erro ao Enviar Convite', err.message || 'Não foi possível enviar o convite para o médico.');
      throw err;
    } finally {
      setSubmittingDoctorInvite(false);
    }
  };

  const handleSimularRecusaMedico = async (conviteId) => {
    try {
      await recusarConvite(idosoId, conviteId);
      await carregarDados();
      Alert.alert('Convite Recusado', 'O médico recusou o convite. O status na rede foi atualizado.');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar o status do convite.');
    }
  };

  const handleDescartarRecusado = async (conviteId) => {
    try {
      await descartarConviteRecusado(idosoId, conviteId);
      await carregarDados();
    } catch (err) {
      console.warn('Erro ao descartar convite recusado:', err.message);
    }
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

        {/* BANNER DE ACESSO RÁPIDO AO CONVITE DE MÉDICO NA ABA TODOS (HU-016) */}
        {isAdmin && filtroAtivo === 'Todos' && (
          <TouchableOpacity
            style={styles.adminMainDoctorBanner}
            onPress={handleConvidarMedico}
            activeOpacity={0.85}
          >
            <View style={styles.adminMainDoctorIconCircle}>
              <Icon name="stethoscope" size={20} color="#031753" />
            </View>
            <View style={styles.adminMainDoctorTexts}>
              <Text style={styles.adminMainDoctorTitle}>
                Convidar Médico do Idoso (HU-016)
              </Text>
              <Text style={styles.adminMainDoctorSub}>
                {limiteMedicosAtingido
                  ? 'Limite de 2 médicos atingido (RN-012)'
                  : `Cadastrar médico de referência via CRM • ${totalMedicos}/2 médicos`}
              </Text>
            </View>
            <View
              style={[
                styles.adminMainDoctorBtn,
                limiteMedicosAtingido && styles.adminMainDoctorBtnDisabled,
              ]}
            >
              <Icon
                name={limiteMedicosAtingido ? 'block' : 'add'}
                size={16}
                color={limiteMedicosAtingido ? '#DC2626' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.adminMainDoctorBtnText,
                  limiteMedicosAtingido && styles.adminMainDoctorBtnTextDisabled,
                ]}
              >
                {limiteMedicosAtingido ? 'Limite' : 'Convidar'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

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
            {/* BANNER DO CORPO CLÍNICO (EXIBIDO NA ABA SAÚDE) */}
            {filtroAtivo === 'Saude' && (
              <View style={styles.doctorHeaderCard}>
                <View style={styles.doctorHeaderTopRow}>
                  <View style={styles.doctorHeaderIconBadge}>
                    <Icon name="stethoscope" size={22} color="#031753" />
                  </View>
                  <View style={styles.doctorHeaderTexts}>
                    <Text style={styles.doctorHeaderTitle}>Corpo Clínico & Médicos</Text>
                    <Text style={styles.doctorHeaderSubtitle}>
                      Acesso aos relatórios semanais de saúde (RN-012)
                    </Text>
                  </View>
                  <View style={[styles.doctorCountBadge, limiteMedicosAtingido && styles.doctorCountBadgeAlert]}>
                    <Text style={[styles.doctorCountBadgeText, limiteMedicosAtingido && styles.doctorCountBadgeTextAlert]}>
                      {totalMedicos}/2 Médicos
                    </Text>
                  </View>
                </View>

                {isAdmin && (
                  <TouchableOpacity
                    style={[
                      styles.doctorInviteTopButton,
                      limiteMedicosAtingido && styles.doctorInviteTopButtonDisabled,
                    ]}
                    onPress={handleConvidarMedico}
                    activeOpacity={0.85}
                  >
                    <Icon
                      name={limiteMedicosAtingido ? 'block' : 'add'}
                      size={16}
                      color={limiteMedicosAtingido ? '#DC2626' : '#FFFFFF'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.doctorInviteTopButtonText,
                        limiteMedicosAtingido && styles.doctorInviteTopButtonTextDisabled,
                      ]}
                    >
                      {limiteMedicosAtingido ? 'Limite de 2 médicos atingido' : '+ Convidar Novo Médico'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ESTADO 3: CARDS DE MÉDICOS QUE RECUSARAM O CONVITE (HU-017 Cenário 2) */}
            {(filtroAtivo === 'Saude' || filtroAtivo === 'Todos') &&
              convitesMedicosRecusados.map((convite) => (
                <View key={convite.id} style={styles.doctorRejectedCard}>
                  <View style={styles.doctorRejectedHeader}>
                    <View style={styles.doctorRejectedAvatar}>
                      <Icon name="person_off" size={20} color="#DC2626" />
                    </View>
                    <View style={styles.doctorRejectedInfo}>
                      <Text style={styles.doctorRejectedName}>
                        {convite.nomeMedico || convite.emailDestinatario}
                      </Text>
                      <Text style={styles.doctorRejectedSub}>
                        {convite.crm ? `CRM ${convite.crm}` : 'Médico de Referência'} • Convite Rejeitado
                      </Text>
                    </View>
                    <View style={styles.doctorRejectedBadge}>
                      <Icon name="cancel" size={11} color="#DC2626" style={{ marginRight: 3 }} />
                      <Text style={styles.doctorRejectedBadgeText}>Recusado</Text>
                    </View>
                  </View>

                  {/* ALERTA OBRIGATÓRIO HU-017: O MÉDICO RECUSOU O CONVITE */}
                  <View style={styles.doctorRejectedAlertBox}>
                    <Icon name="error" size={16} color="#B91C1C" style={{ marginRight: 8 }} />
                    <Text style={styles.doctorRejectedAlertText}>
                      O médico recusou o convite
                    </Text>
                  </View>

                  <Text style={styles.doctorRejectedHelpText}>
                    O profissional optou por não se vincular à rede de monitoramento deste paciente no momento.
                  </Text>

                  <View style={styles.doctorRejectedActions}>
                    {isAdmin && (
                      <TouchableOpacity
                        style={styles.doctorRejectedBtnReinvite}
                        onPress={() => {
                          if (limiteMedicosAtingido) {
                            Alert.alert('Limite de Médicos', 'Limite de 2 médicos atingido');
                            return;
                          }
                          setModalDoctorInviteVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Icon name="refresh" size={14} color="#031753" style={{ marginRight: 4 }} />
                        <Text style={styles.doctorRejectedBtnReinviteText}>Convidar Outro</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.doctorRejectedBtnDismiss}
                      onPress={() => handleDescartarRecusado(convite.id)}
                      activeOpacity={0.8}
                    >
                      <Icon name="delete" size={14} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.doctorRejectedBtnDismissText}>Descartar Aviso</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

            {/* ESTADO 2: CARDS DE MÉDICOS PENDENTES NA ABA SAÚDE (HU-016 Cenário 1) */}
            {filtroAtivo === 'Saude' &&
              convitesMedicosPendentes.map((convite) => (
                <View key={convite.id} style={styles.doctorPendingCard}>
                  <View style={styles.pendingHeaderRow}>
                    <View style={styles.doctorPendingAvatarWrapper}>
                      <View style={styles.doctorPendingAvatar}>
                        <Icon name="stethoscope" size={20} color="#D97706" />
                      </View>
                    </View>
                    <View style={styles.pendingHeaderInfo}>
                      <Text style={styles.pendingName} numberOfLines={1}>
                        {convite.nomeMedico || convite.emailDestinatario}
                      </Text>
                      <Text style={styles.pendingSubtitle}>
                        {convite.crm ? `CRM ${convite.crm}` : 'Médico(a)'} • Aguardando Aceite
                      </Text>
                    </View>
                    <View style={styles.pendingStatusBadge}>
                      <Icon name="hourglass_top" size={11} color="#B45309" style={{ marginRight: 3 }} />
                      <Text style={styles.pendingStatusText}>Pendente</Text>
                    </View>
                  </View>

                  <View style={styles.pendingInfoRow}>
                    <Icon name="schedule" size={13} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.pendingInfoText}>
                      Expira em {convite.validadeHorasRestantes || 72}h • Link de uso único
                    </Text>
                  </View>

                  <View style={styles.pendingActionsRow}>
                    <TouchableOpacity
                      style={styles.pendingBtnDebug}
                      onPress={async () => {
                        try {
                          const novoVinculado = {
                            id: `med-${Date.now()}`,
                            nome: convite.nomeMedico || 'Dr. Convidado',
                            nomeCompleto: convite.nomeMedico || 'Dr. Convidado',
                            crm: convite.crm || '123456/SP',
                            grauParentesco: 'Médico',
                            papelAcesso: 'MEDICO',
                            tipoMembro: 'MEDICO',
                            categoria: 'saude',
                            badgeTexto: 'Médico Vinculado',
                            badgeTipo: 'especialista',
                            online: true,
                            telefone: '+55 11 98888-7777',
                            email: convite.emailDestinatario,
                            acoes: ['call', 'prontuario'],
                          };
                          setMembros((prev) => [novoVinculado, ...prev]);
                          await cancelarConvite(idosoId, convite.id);
                          await carregarDados();
                          Alert.alert('Sucesso', 'Médico aceitou o convite e agora está vinculado à rede!');
                        } catch (e) {
                          console.warn(e);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Icon name="check" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.pendingBtnDebugText}>[Debug] Aceitar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pendingBtnRejectDebug}
                      onPress={() => handleSimularRecusaMedico(convite.id)}
                      activeOpacity={0.8}
                    >
                      <Icon name="close" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.pendingBtnDebugText}>[Debug] Recusar</Text>
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
              ))}

            {/* ESTADO 1: CARDS DE MEMBROS E MÉDICOS VINCULADOS */}
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

      {/* BOTÕES DE CONVITE INFERIORES (FAMILIAR E MÉDICO HU-016) */}
      {isAdmin ? (
        <View style={styles.inviteButtonsRow}>
          <TouchableOpacity
            style={[
              styles.inviteCtaHalfButton,
              styles.inviteCtaFamily,
              limiteAtingido && styles.inviteCtaButtonDisabled,
            ]}
            onPress={handleConvidar}
            activeOpacity={0.85}
          >
            <Icon name="person_add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.inviteCtaHalfText}>
              {limiteAtingido ? 'Limite Família' : '+ Familiar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.inviteCtaHalfButton,
              styles.inviteCtaDoctor,
              limiteMedicosAtingido && styles.doctorInviteCtaButtonDisabled,
            ]}
            onPress={handleConvidarMedico}
            activeOpacity={0.85}
          >
            <Icon
              name="stethoscope"
              size={18}
              color={limiteMedicosAtingido ? '#DC2626' : '#FFFFFF'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.inviteCtaHalfText,
                limiteMedicosAtingido && styles.doctorInviteCtaButtonTextDisabled,
              ]}
            >
              {limiteMedicosAtingido ? 'Limite 2 Médicos' : '+ Médico (CRM)'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}
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
      onOpenDoctorInvite={() => {
        setModalInviteVisible(false);
        handleConvidarMedico();
      }}
      loading={submittingInvite}
    />

    {/* MODAL DE CONVITE DO MÉDICO DO IDOSO (HU-016) */}
    <InviteDoctorModal
      visible={modalDoctorInviteVisible}
      limiteAtingido={limiteMedicosAtingido}
      totalMedicos={totalMedicos}
      onClose={() => setModalDoctorInviteVisible(false)}
      onSendDoctorInvite={handleEnviarConviteMedico}
      onOpenAcceptInvite={(token) => {
        setModalDoctorInviteVisible(false);
        if (onNavigate) {
          onNavigate('AcceptInvite', { token });
        }
      }}
      onSimulateReject={(conviteId) => {
        setModalDoctorInviteVisible(false);
        handleSimularRecusaMedico(conviteId);
      }}
      loading={submittingDoctorInvite}
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
  doctorHeaderCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  doctorHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorHeaderIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  doctorHeaderTexts: {
    flex: 1,
  },
  doctorHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#031753',
  },
  doctorHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  doctorCountBadge: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  doctorCountBadgeAlert: {
    backgroundColor: '#FEE2E2',
  },
  doctorCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  doctorCountBadgeTextAlert: {
    color: '#DC2626',
  },
  doctorInviteTopButton: {
    backgroundColor: '#031753',
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  doctorInviteTopButtonDisabled: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    shadowOpacity: 0,
    elevation: 0,
  },
  doctorInviteTopButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  doctorInviteTopButtonTextDisabled: {
    color: '#DC2626',
  },
  doctorInviteCtaButton: {
    backgroundColor: '#031753',
    shadowColor: '#031753',
  },
  doctorPendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  doctorPendingAvatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorPendingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBtnRejectDebug: {
    flex: 1.1,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorRejectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  doctorRejectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  doctorRejectedAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  doctorRejectedInfo: {
    flex: 1,
  },
  doctorRejectedName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  doctorRejectedSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  doctorRejectedBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorRejectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  doctorRejectedAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 8,
  },
  doctorRejectedAlertText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
  },
  doctorRejectedHelpText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  doctorRejectedActions: {
    flexDirection: 'row',
    gap: 10,
  },
  doctorRejectedBtnReinvite: {
    flex: 1.2,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EBF5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorRejectedBtnReinviteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
  },
  doctorRejectedBtnDismiss: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorRejectedBtnDismissText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  adminMainDoctorBanner: {
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    shadowColor: '#0369A1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  adminMainDoctorIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  adminMainDoctorTexts: {
    flex: 1,
  },
  adminMainDoctorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#031753',
  },
  adminMainDoctorSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  adminMainDoctorBtn: {
    backgroundColor: '#031753',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminMainDoctorBtnDisabled: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  adminMainDoctorBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminMainDoctorBtnTextDisabled: {
    color: '#DC2626',
  },
  inviteButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  inviteCtaHalfButton: {
    flex: 1,
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inviteCtaFamily: {
    backgroundColor: '#D83729',
    shadowColor: '#D83729',
  },
  inviteCtaDoctor: {
    backgroundColor: '#031753',
    shadowColor: '#031753',
  },
  inviteCtaHalfText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  doctorInviteCtaButtonDisabled: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    shadowOpacity: 0,
    elevation: 0,
  },
  doctorInviteCtaButtonTextDisabled: {
    color: '#DC2626',
  },
});