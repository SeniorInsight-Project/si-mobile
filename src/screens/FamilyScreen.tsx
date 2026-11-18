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
import BottomNavBar, { useEspacoBarraInferior } from '../components/BottomNavBar';
import InviteMemberModal from '../components/InviteMemberModal';
import InviteDoctorModal from '../components/InviteDoctorModal';
import Icon from '../components/Icon';
import SemIdosoCard from '../components/SemIdosoCard';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import {
  listarMembrosRede,
  gerarConvite,
  gerarConviteMedico,
  recusarConvite,
  descartarConviteRecusado,
  listarConvitesPendentes,
  cancelarConvite,
  editarConvite,
  LIMITE_MEDICOS_RN012,
  LIMITE_FAMILIARES_RN012,
  ConviteInput,
  ConvitePendente,
  DadosConviteMedicoInput,
  MembroRede,
} from '../services/redeProtecaoService';
import { mockPermitido } from '../config/ambiente';
import { colors, font, rounded, shadows, sizes, typography } from '../theme';
import { useIdoso } from '../context/IdosoContext';

export interface FamilyScreenProps {
  onNavigate?: (screen: string, params?: Record<string, unknown>) => void;
  idosoId?: string | null;
  isFamiliarAdmin?: boolean | string;
  papelAcesso?: string;
}

export default function FamilyScreen({
  onNavigate,
  idosoId: idosoIdProp,
  isFamiliarAdmin = true,
  papelAcesso = 'ADMIN',
}: FamilyScreenProps) {
  const espacoInferior = useEspacoBarraInferior();
  // O idoso vem do contexto; a prop `idosoId` serve só de override (testes).
  const { idosoId: idosoIdContexto, nomeIdoso } = useIdoso();
  const idosoId = idosoIdProp ?? idosoIdContexto;
  const isAdmin = Boolean(
    isFamiliarAdmin === true ||
    isFamiliarAdmin === 'true' ||
    String(papelAcesso || '').toUpperCase() === 'ADMIN' ||
    String(papelAcesso || '').toUpperCase() === 'ADMINISTRADOR'
  );
  const [filtroAtivo, setFiltroAtivo] = useState<string>('Todos');
  const [membros, setMembros] = useState<MembroRede[]>([]);
  const [convitesPendentes, setConvitesPendentes] = useState<ConvitePendente[]>([]);
  const [carregandoMembros, setCarregandoMembros] = useState<boolean>(false);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [modalInviteVisible, setModalInviteVisible] = useState<boolean>(false);
  const [modalDoctorInviteVisible, setModalDoctorInviteVisible] = useState<boolean>(false);
  const [conviteParaEditar, setConviteParaEditar] = useState<ConvitePendente | null>(null);
  const [submittingInvite, setSubmittingInvite] = useState<boolean>(false);
  const [submittingDoctorInvite, setSubmittingDoctorInvite] = useState<boolean>(false);
  // Ações de simulação ([Debug] Aceitar/Recusar) só existem com mock ligado: fora dele,
  // chamariam a API real (cancelar/recusar convite) e mostrariam um resultado falso.
  const simulacaoPermitida = mockPermitido();

  const carregarDados = async () => {
    if (!idosoId) {
      setMembros([]);
      setConvitesPendentes([]);
      setCarregandoMembros(false);
      return;
    }
    try {
      setCarregandoMembros(true);
      setErroCarregamento(null);
      const [listaMembros, listaPendentes] = await Promise.all([
        listarMembrosRede(idosoId),
        listarConvitesPendentes(idosoId),
      ]);
      setMembros(Array.isArray(listaMembros) ? listaMembros : []);
      setConvitesPendentes(Array.isArray(listaPendentes) ? listaPendentes : []);
    } catch (err: any) {
      console.warn('[FamilyScreen] Erro ao carregar dados:', err?.message);
      setErroCarregamento('Não foi possível carregar a rede');
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

  const handleEnviarConvite = async (dadosConvite: ConviteInput) => {
    if (!idosoId) throw new Error('Nenhum idoso selecionado.');
    try {
      setSubmittingInvite(true);
      const resultado = await gerarConvite(idosoId, dadosConvite);
      await carregarDados();
      return resultado;
    } catch (err: any) {
      Alert.alert('Erro ao Enviar Convite', err?.message || 'Não foi possível enviar o convite.');
      throw err;
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleEditarConvite = (convite: ConvitePendente) => {
    setConviteParaEditar(convite);
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

  const handleEnviarConviteMedico = async (dadosMedico: DadosConviteMedicoInput) => {
    if (!idosoId) throw new Error('Nenhum idoso selecionado.');
    try {
      setSubmittingDoctorInvite(true);
      const resultado = await gerarConviteMedico(idosoId, dadosMedico, {
        papelUsuario: papelAcesso,
        isAdmin,
      });
      await carregarDados();
      return resultado;
    } catch (err: any) {
      Alert.alert('Erro ao Enviar Convite', err?.message || 'Não foi possível enviar o convite para o médico.');
      throw err;
    } finally {
      setSubmittingDoctorInvite(false);
    }
  };

  const handleSimularRecusaMedico = async (conviteId: string) => {
    if (!idosoId) return;
    try {
      await recusarConvite(idosoId, conviteId);
      await carregarDados();
      Alert.alert('Convite Recusado', 'O médico recusou o convite. O status na rede foi atualizado.');
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível atualizar o status do convite.');
    }
  };

  const handleDescartarRecusado = async (conviteId: string) => {
    if (!idosoId) return;
    try {
      await descartarConviteRecusado(idosoId, conviteId);
      await carregarDados();
    } catch (err: any) {
      console.warn('Erro ao descartar convite recusado:', err?.message);
    }
  };

  const handleSalvarEdicaoConvite = async (conviteId: string, novosDados: Partial<ConviteInput>) => {
    if (!idosoId) return;
    try {
      await editarConvite(idosoId, conviteId, novosDados);
      await carregarDados();
      Alert.alert('Sucesso', 'Informações do convite atualizadas.');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível atualizar o convite.');
    }
  };

  const handleCancelarConvite = (convite: ConvitePendente) => {
    if (!idosoId) return;
    const idAtivo = idosoId;
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
              await cancelarConvite(idAtivo, convite.id);
              await carregarDados();
              Alert.alert('Convite Cancelado', 'O convite foi cancelado e removido.');
            } catch (err: any) {
              Alert.alert('Erro', err?.message || 'Não foi possível cancelar o convite.');
            }
          },
        },
      ]
    );
  };

  const handleCompartilharConvite = async (convite: ConvitePendente) => {
    try {
      const link = convite.linkConvite || `seniorinsight://convite/${convite.token}`;
      await Share.share({
        title: 'Convite para Rede de Cuidados SeniorInsight',
        message: `Olá! Você foi convidado para a Rede de Cuidados de ${convite.nomeIdoso || nomeIdoso || 'do idoso'} no SeniorInsight.\n\nToque no link seguro para aceitar o convite: ${link}\n\n(Válido por 48 horas)`,
        url: link,
      });
    } catch (err: any) {
      Alert.alert('Erro ao compartilhar', err?.message);
    }
  };

  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO */}
      <AppHeader
        title="Família"
        onNavigate={onNavigate}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: espacoInferior }]}
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
            {nomeIdoso
              ? `Pessoas autorizadas para alertas SOS e acompanhamento diário de ${nomeIdoso}.`
              : 'Pessoas autorizadas para alertas SOS e acompanhamento diário do idoso.'}
          </Text>

          {/* Caixa Azul de Plantão Atual (#EBF5FF, rx=20) */}
          <TouchableOpacity
            style={styles.onDutyBox}
            onPress={() => onNavigate && onNavigate('ElderlyProfile')}
            activeOpacity={0.85}
          >
            <View style={styles.onDutyIconCircle}>
              <Icon name="shield_check" size={18} color={colors.primary} />
            </View>
            <View style={styles.onDutyTexts}>
              <Text style={styles.onDutyTitle}>
                {membroPlantao ? `Plantão Atual: ${membroPlantao.nome}` : 'Ninguém de plantão ainda'}
              </Text>
              <Text style={styles.onDutySub}>
                {membroPlantao
                  ? membroPlantao.statusLabel
                  : carregandoMembros
                    ? 'Carregando a rede...'
                    : 'Convide um familiar para receber os alertas SOS.'}
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
              <Icon name="stethoscope" size={20} color={colors.primary} />
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
                color={limiteMedicosAtingido ? colors.error : colors.white}
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
                  <Icon name="mail" size={32} color={colors.textMuted} />
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
                        <Icon name="mail" size={20} color={colors.sky.text} />
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
                      <Icon name="schedule" size={11} color={colors.amber.textDark} style={{ marginRight: 3 }} />
                      <Text style={styles.pendingStatusText}>Aguardando</Text>
                    </View>
                  </View>

                  {/* Detalhes de Expiração */}
                  <View style={styles.pendingInfoRow}>
                    <Icon name="hourglass_top" size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.pendingInfoText}>
                      Expira em {convite.validadeHorasRestantes || 48}h • Link de uso único
                    </Text>
                  </View>

                  {/* Ações: Editar, Reenviar Link e Cancelar */}
                  <View style={styles.pendingIconActionsRow}>
                    <IconButton
                      icon="edit"
                      variant="neutral"
                      accessibilityLabel={`Editar convite de ${convite.emailDestinatario}`}
                      onPress={() => handleEditarConvite(convite)}
                    />
                    <IconButton
                      icon="share"
                      variant="neutral"
                      accessibilityLabel={`Reenviar convite de ${convite.emailDestinatario}`}
                      onPress={() => handleCompartilharConvite(convite)}
                    />
                    <IconButton
                      icon="delete"
                      variant="danger"
                      accessibilityLabel={`Cancelar convite de ${convite.emailDestinatario}`}
                      onPress={() => handleCancelarConvite(convite)}
                    />
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
                    <Icon name="stethoscope" size={22} color={colors.primary} />
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
                  <View style={styles.doctorInviteTopWrapper}>
                    <Button
                      title="Convidar Novo Médico"
                      onPress={handleConvidarMedico}
                      variant="primary"
                      iconLeft="stethoscope"
                      disabled={limiteMedicosAtingido}
                    />
                    {limiteMedicosAtingido ? (
                      <Text style={styles.limitReasonText}>
                        Limite de 2 médicos atingido (RN-012)
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>
            )}

            {/* ESTADO 3: CARDS DE MÉDICOS QUE RECUSARAM O CONVITE (HU-017 Cenário 2) */}
            {(filtroAtivo === 'Saude' || filtroAtivo === 'Todos') &&
              convitesMedicosRecusados.map((convite) => (
                <View key={convite.id} style={styles.doctorRejectedCard}>
                  <View style={styles.doctorRejectedHeader}>
                    <View style={styles.doctorRejectedAvatar}>
                      <Icon name="person_off" size={20} color={colors.error} />
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
                      <Icon name="cancel" size={11} color={colors.error} style={{ marginRight: 3 }} />
                      <Text style={styles.doctorRejectedBadgeText}>Recusado</Text>
                    </View>
                  </View>

                  {/* ALERTA OBRIGATÓRIO HU-017: O MÉDICO RECUSOU O CONVITE */}
                  <View style={styles.doctorRejectedAlertBox}>
                    <Icon name="error" size={16} color={colors.error} style={{ marginRight: 8 }} />
                    <Text style={styles.doctorRejectedAlertText}>
                      O médico recusou o convite
                    </Text>
                  </View>

                  <Text style={styles.doctorRejectedHelpText}>
                    O profissional optou por não se vincular à rede de monitoramento deste paciente no momento.
                  </Text>

                  <View style={styles.doctorRejectedActions}>
                    {isAdmin && (
                      <View style={styles.doctorRejectedActionCol}>
                        <Button
                          title="Convidar Outro"
                          variant="secondary"
                          size="md"
                          iconLeft="refresh"
                          onPress={() => {
                            if (limiteMedicosAtingido) {
                              Alert.alert('Limite de Médicos', 'Limite de 2 médicos atingido');
                              return;
                            }
                            setModalDoctorInviteVisible(true);
                          }}
                        />
                      </View>
                    )}

                    <View style={styles.doctorRejectedActionCol}>
                      <Button
                        title="Descartar Aviso"
                        variant="ghost"
                        size="md"
                        iconLeft="delete"
                        onPress={() => handleDescartarRecusado(convite.id)}
                      />
                    </View>
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
                        <Icon name="stethoscope" size={20} color={colors.amber.text} />
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
                      <Icon name="hourglass_top" size={11} color={colors.amber.textDark} style={{ marginRight: 3 }} />
                      <Text style={styles.pendingStatusText}>Pendente</Text>
                    </View>
                  </View>

                  <View style={styles.pendingInfoRow}>
                    <Icon name="schedule" size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={styles.pendingInfoText}>
                      Expira em {convite.validadeHorasRestantes || 72}h • Link de uso único
                    </Text>
                  </View>

                  <View style={styles.pendingDoctorActionsContainer}>
                    {__DEV__ && simulacaoPermitida && (
                      <View style={styles.pendingDebugRow}>
                        <View style={styles.pendingDebugCol}>
                          <Button
                            title="[Debug] Aceitar"
                            variant="outline"
                            size="md"
                            iconLeft="check"
                            onPress={async () => {
                              if (!idosoId) return;
                              try {
                                const novoVinculado = {
                                  id: `med-${Date.now()}`,
                                  nome: convite.nomeMedico || convite.emailDestinatario || 'Médico',
                                  nomeCompleto: convite.nomeMedico || convite.emailDestinatario || 'Médico',
                                  crm: convite.crm,
                                  grauParentesco: 'Médico',
                                  papelAcesso: 'MEDICO',
                                  tipoMembro: 'MEDICO',
                                  categoria: 'saude',
                                  badgeTexto: 'Médico Vinculado',
                                  badgeTipo: 'especialista',
                                  online: true,
                                  email: convite.emailDestinatario,
                                  acoes: ['call', 'prontuario'],
                                };
                                await cancelarConvite(idosoId, convite.id);
                                setMembros((prev) => [novoVinculado as MembroRede, ...prev]);
                                await carregarDados();
                                Alert.alert('Sucesso', 'Médico aceitou o convite e agora está vinculado à rede!');
                              } catch (e: any) {
                                Alert.alert('Erro', e?.message || 'Falha ao aceitar convite.');
                              }
                            }}
                          />
                        </View>
                        <View style={styles.pendingDebugCol}>
                          <Button
                            title="[Debug] Recusar"
                            variant="outline"
                            size="md"
                            iconLeft="close"
                            onPress={() => handleSimularRecusaMedico(convite.id)}
                          />
                        </View>
                      </View>
                    )}

                    <View style={styles.pendingIconActionsRow}>
                      <IconButton
                        icon="share"
                        variant="neutral"
                        accessibilityLabel={`Reenviar convite de ${convite.nomeMedico || convite.emailDestinatario}`}
                        onPress={() => handleCompartilharConvite(convite)}
                      />
                      <IconButton
                        icon="delete"
                        variant="danger"
                        accessibilityLabel={`Cancelar convite de ${convite.nomeMedico || convite.emailDestinatario}`}
                        onPress={() => handleCancelarConvite(convite)}
                      />
                    </View>
                  </View>
                </View>
              ))}

            {/* ESTADO DE ERRO */}
            {erroCarregamento && (
              <View style={styles.errorCardContainer}>
                <Icon name="error" size={24} color={colors.error} />
                <Text style={styles.errorCardTitle}>Não foi possível carregar a rede</Text>
                <Button
                  title="Tentar novamente"
                  onPress={carregarDados}
                  variant="secondary"
                  iconLeft="refresh"
                  fullWidth={false}
                />
              </View>
            )}

            {/* ESTADO VAZIO */}
            {!erroCarregamento && membrosFiltrados.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum membro encontrado</Text>
              </View>
            )}

            {/* ESTADO 1: CARDS DE MEMBROS E MÉDICOS VINCULADOS */}
            {!erroCarregamento && membrosFiltrados.map((membro) => (
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
                          borderColor: membro.online ? colors.mint.background : colors.surfaceSubtle,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          ...font('body', 700),
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
                            ? colors.success
                            : colors.outlineVariant,
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
                    name={membro.infoIcon ?? ''}
                    size={15}
                    color={membro.infoDestaque ? colors.primary : colors.textSecondary}
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
                  {membro.acoes.map((acao: string) => {
                    if (acao === 'call_primary') {
                      return (
                        <TouchableOpacity
                          key={acao}
                          style={[
                            styles.actionCircle,
                            { backgroundColor: colors.success },
                          ]}
                          onPress={() =>
                            Alert.alert(
                              'Ligar',
                              `Chamando ${membro.nome}...`
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Icon name="call" size={16} color={colors.white} />
                        </TouchableOpacity>
                      );
                    }
                    if (acao === 'whatsapp_primary') {
                      return (
                        <TouchableOpacity
                          key={acao}
                          style={[
                            styles.actionCircle,
                            { backgroundColor: colors.primaryNavy },
                          ]}
                          onPress={() =>
                            Alert.alert(
                              'WhatsApp',
                              `Abrindo conversa com ${membro.nome}...`
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Icon name="chat" size={16} color={colors.white} />
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
                          <Icon name="history" size={16} color={colors.primary} />
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
                          <Icon name="call" size={16} color={colors.successDark} />
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
                          <Icon name="chat" size={16} color={colors.primaryNavy} />
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
                          <Icon name="assignment" size={16} color={colors.primary} />
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
          <Icon name="crisis_alert" size={18} color={colors.coralDark} />
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
        <View style={styles.inviteButtonsContainer}>
          <View style={styles.inviteButtonsRow}>
            <View style={styles.inviteButtonCol}>
              <Button
                title="Familiar"
                iconLeft="person_add"
                variant="primary"
                disabled={limiteAtingido}
                onPress={handleConvidar}
              />
            </View>
            <View style={styles.inviteButtonCol}>
              <Button
                title="Médico (CRM)"
                iconLeft="stethoscope"
                variant="primary"
                disabled={limiteMedicosAtingido}
                onPress={handleConvidarMedico}
              />
            </View>
          </View>
          {limiteAtingido ? (
            <Text style={styles.limitReasonText}>
              Limite de 5 familiares atingido (RN-012)
            </Text>
          ) : null}
          {limiteMedicosAtingido ? (
            <Text style={styles.limitReasonText}>
              Limite de 2 médicos atingido (RN-012)
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.inviteButtonsContainer}>
          <Button
            title="Convidar Novo Membro"
            iconLeft="person_add"
            variant="primary"
            disabled={limiteAtingido}
            onPress={handleConvidar}
          />
          {limiteAtingido ? (
            <Text style={styles.limitReasonText}>
              Limite de 5 familiares atingido (RN-012)
            </Text>
          ) : null}
        </View>
      )}

      {/* PRIVACIDADE (HU-022): exclusão da conta e dos dados */}
      <TouchableOpacity
        style={styles.deleteAccountLink}
        onPress={() => onNavigate && onNavigate('DeleteAccount')}
        activeOpacity={0.7}
        accessibilityRole="button"
        testID="familia-excluir-conta"
      >
        <Icon name="delete" size={18} color={colors.textSecondary} />
        <Text style={styles.deleteAccountText}>Excluir minha conta e meus dados</Text>
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
      onOpenAcceptInvite={simulacaoPermitida ? (token: string) => {
        setModalDoctorInviteVisible(false);
        if (onNavigate) {
          onNavigate('AcceptInvite', { token });
        }
      } : undefined}
      onSimulateReject={simulacaoPermitida ? (conviteId: string) => {
        setModalDoctorInviteVisible(false);
        handleSimularRecusaMedico(conviteId);
      } : undefined}
      loading={submittingDoctorInvite}
    />

      {/* BARRA INFERIOR DE NAVEGAÇÃO */}
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  deleteAccountLink: {
    minHeight: 48,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteAccountText: { fontSize: 14, ...font('body', 600), color: colors.textSecondary },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 20,
    marginBottom: 16,
    ...shadows.tier2,
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
    borderRadius: rounded.sm,
    backgroundColor: colors.success,
  },
  circleConnectedLabel: {
    fontSize: 14,
    color: colors.successDark,
    letterSpacing: 0.4,
    ...font('heading', 700),
  },
  activeMembersPill: {
    backgroundColor: colors.mint.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  activeMembersText: {
    fontSize: 14,
    color: colors.mint.textDark,
    ...font('heading', 700),
  },
  summaryTitle: {
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 4,
    ...font('heading', 800),
  },
  summarySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
    ...font('body', 500),
  },
  onDutyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.xl,
    padding: 12,
    gap: 12,
  },
  onDutyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: rounded.xl,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onDutyTexts: {
    flex: 1,
  },
  onDutyTitle: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 2,
    ...font('heading', 700),
  },
  onDutySub: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('body', 600),
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: rounded.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.tier1,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('heading', 600),
  },
  filterPillTextActive: {
    color: colors.white,
    ...font('body', 700),
  },
  membersList: {
    gap: 14,
    marginBottom: 16,
  },
  memberCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    ...shadows.tier2,
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
    borderRadius: rounded.card,
    borderWidth: 2,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: rounded.sm,
    borderWidth: 2,
    borderColor: colors.white,
  },
  memberTexts: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 2,
    ...font('heading', 800),
  },
  memberSub: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  roleBadgeText: {
    fontSize: 14,
    ...font('heading', 800),
  },
  memberBottomBar: {
    height: 52,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.xl,
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
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    ...font('body', 600),
  },
  memberInfoTextHighlight: {
    color: colors.textPrimary,
    ...font('body', 700),
  },
  memberActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCircle: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCircleWhite: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderRadius: rounded.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.tier1,
  },
  sosSequenceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.peach.background,
    borderRadius: rounded.card,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  sosSequenceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: rounded.xl,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosSequenceTexts: {
    flex: 1,
  },
  sosSequenceTitle: {
    fontSize: 14,
    color: colors.coralDark,
    marginBottom: 2,
    ...font('heading', 800),
  },
  sosSequenceSub: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 16,
    ...font('body', 600),
  },
  inviteCtaButton: {
    height: 56,
    borderRadius: rounded.card,
    backgroundColor: colors.coralDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.tier2,
  },
  inviteCtaText: {
    fontSize: 15,
    color: colors.white,
    ...font('heading', 800),
  },
  inviteCtaButtonDisabled: {
    backgroundColor: colors.textMuted,
    shadowColor: colors.textMuted,
    shadowOpacity: 0.1,
  },
  pendingInviteCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.tier1,
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
    borderRadius: rounded.card,
    backgroundColor: colors.sky.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  pendingName: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.textPrimary,
    marginBottom: 2,
  },
  pendingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 500),
  },
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.amber.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.input,
  },
  pendingStatusText: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.amber.textDark,
  },
  pendingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvasBase,
    borderRadius: rounded.input,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  pendingInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 500),
  },
  pendingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyPendingCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  emptyPendingIconCircle: {
    width: 60,
    height: 60,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyPendingTitle: {
    fontSize: 16,
    ...font('body', 700),
    color: colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyPendingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  doctorHeaderCard: {
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.card,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: colors.sky.border,
  },
  doctorHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorHeaderIconBadge: {
    width: 40,
    height: 40,
    borderRadius: rounded.xl,
    backgroundColor: colors.infoSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  doctorHeaderTexts: {
    flex: 1,
  },
  doctorHeaderTitle: {
    fontSize: 15,
    ...font('body', 700),
    color: colors.primary,
  },
  doctorHeaderSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doctorCountBadge: {
    backgroundColor: colors.sky.background,
    borderRadius: rounded.input,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  doctorCountBadgeAlert: {
    backgroundColor: colors.peach.background,
  },
  doctorCountBadgeText: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.sky.textDark,
  },
  doctorCountBadgeTextAlert: {
    color: colors.error,
  },
  doctorPendingCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.amber.border,
    ...shadows.tier1,
  },
  doctorPendingAvatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: rounded.card,
    backgroundColor: colors.amber.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorPendingAvatar: {
    width: 36,
    height: 36,
    borderRadius: rounded.xl,
    backgroundColor: colors.amber.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorRejectedCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.peach.border,
    ...shadows.tier2,
  },
  doctorRejectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  doctorRejectedAvatar: {
    width: 42,
    height: 42,
    borderRadius: rounded.card,
    backgroundColor: colors.peach.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  doctorRejectedInfo: {
    flex: 1,
  },
  doctorRejectedName: {
    fontSize: 15,
    ...font('body', 700),
    color: colors.textPrimary,
  },
  doctorRejectedSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doctorRejectedBadge: {
    backgroundColor: colors.peach.background,
    borderRadius: rounded.input,
    paddingVertical: 3,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorRejectedBadgeText: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.error,
  },
  doctorRejectedAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peach.background,
    borderRadius: rounded.input,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.peach.border,
    marginBottom: 8,
  },
  doctorRejectedAlertText: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.error,
  },
  doctorRejectedHelpText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  doctorRejectedActions: {
    flexDirection: 'row',
    gap: 10,
  },
  adminMainDoctorBanner: {
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.xl,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.sky.border,
    ...shadows.tier2,
  },
  adminMainDoctorIconCircle: {
    width: 38,
    height: 38,
    borderRadius: rounded.xl,
    backgroundColor: colors.infoSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  adminMainDoctorTexts: {
    flex: 1,
  },
  adminMainDoctorTitle: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.primary,
  },
  adminMainDoctorSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adminMainDoctorBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adminMainDoctorBtnDisabled: {
    backgroundColor: colors.peach.background,
    borderWidth: 1,
    borderColor: colors.peach.border,
  },
  adminMainDoctorBtnText: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.white,
  },
  adminMainDoctorBtnTextDisabled: {
    color: colors.error,
  },
  inviteButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  inviteCtaHalfButton: {
    flex: 1,
    height: 54,
    borderRadius: rounded.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.tier2,
  },
  inviteCtaFamily: {
    backgroundColor: colors.coralDark,
    shadowColor: colors.coralDark,
  },
  inviteCtaDoctor: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },
  inviteCtaHalfText: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.white,
    letterSpacing: 0.2,
  },
  doctorInviteCtaButtonDisabled: {
    backgroundColor: colors.peach.background,
    borderWidth: 1,
    borderColor: colors.peach.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  doctorInviteCtaButtonTextDisabled: {
    color: colors.error,
  },
  errorCardContainer: {
    backgroundColor: colors.peach.background,
    borderRadius: rounded.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.peach.border,
  },
  errorCardTitle: {
    fontSize: 15,
    ...font('body', 700),
    color: colors.peach.text,
    marginTop: 8,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: rounded.xl,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.white,
    ...font('body', 700),
    fontSize: 14,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pendingIconActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  doctorInviteTopWrapper: {
    gap: 8,
  },
  limitReasonText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    ...font('body', 500),
  },
  doctorRejectedActionCol: {
    flex: 1,
  },
  pendingDoctorActionsContainer: {
    gap: 10,
  },
  pendingDebugRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pendingDebugCol: {
    flex: 1,
  },
  inviteButtonsContainer: {
    gap: 8,
    marginTop: 8,
  },
  inviteButtonCol: {
    flex: 1,
  },
});