import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from '../components/Icon';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar, { useEspacoBarraInferior } from '../components/BottomNavBar';
import RescueCommandCard from '../components/RescueCommandCard';
import LiveGpsMap from '../components/LiveGpsMap';
import DeviceStatusModal from '../components/DeviceStatusModal';
import SemIdosoCard from '../components/SemIdosoCard';
import { atualizarStatusAlarme, obterAlarmeAtivo } from '../services/alarmeSosService';
import { listarIdososDoFamiliar, ElderlyProfile } from '../services/elderlyService';
import { escolherIdosoSelecionado } from '../services/selecaoIdoso';
import { extrairMensagemErro } from '../services/erroHelper';
import { useIdoso } from '../context/IdosoContext';
import { useNomeUsuario } from '../context/UsuarioContext';
import {
  buscarStatusDispositivo,
  LIMITE_BATERIA_BAIXA,
  verificarPerdaDados,
  StatusDispositivo,
  ResultadoPerdaDados,
} from '../services/deviceStatusService';
import { buscarEstadoAtual, EstadoAtual } from '../services/telemetryService';
import { buscarScoreBemEstar, ScoreBemEstar } from '../services/riskScoreService';
import {
  obterConsentimentos,
  statusMonitoramento,
  mensagemParaFamilia,
  type Consentimentos,
} from '../services/consentimentoService';
import {
  avisoFimTrial,
  DireitoPremium,
  formatarFaixaTrial,
  obterDireitoPremium,
} from '../services/premiumService';
import SemaforoMotivoModal from '../components/SemaforoMotivoModal';
import Button from '../components/Button';
import { colors, font, rounded, shadows, typography } from '../theme';

function calcularIdade(dataNascimento?: string): number | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataNascimento || '');
  if (!match) return null;
  const hoje = new Date();
  const nascimento = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  if (
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())
  ) {
    idade -= 1;
  }
  return idade;
}

export interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
  onSelectElderly?: (idosoId: string | null) => void;
  plano?: string;
  onLogout?: () => void;
}

export default function HomeScreen({
  onNavigate,
  onSelectElderly,
  onLogout,
  plano: planoProp,
}: HomeScreenProps) {
  const espacoInferior = useEspacoBarraInferior();
  const nomeUsuario = useNomeUsuario();
  const [resgateAtivo, setResgateAtivo] = useState<boolean>(false);
  const [alarmeIdAtivo, setAlarmeIdAtivo] = useState<string | null>(null);
  const [idosos, setIdosos] = useState<ElderlyProfile[]>([]);
  const [loadingIdosos, setLoadingIdosos] = useState<boolean>(false);
  const [erroIdosos, setErroIdosos] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<StatusDispositivo | null>(null);
  const [modalDeviceVisible, setModalDeviceVisible] = useState<boolean>(false);
  const [perdaDados, setPerdaDados] = useState<ResultadoPerdaDados | null>(null);
  const [telemetria, setTelemetria] = useState<EstadoAtual | null>(null);
  const [scoreData, setScoreData] = useState<ScoreBemEstar | null>(null);
  const [consentimentosIdoso, setConsentimentosIdoso] = useState<Consentimentos | null>(null);
  const [modalSemaforoVisible, setModalSemaforoVisible] = useState<boolean>(false);
  const [direitoPremium, setDireitoPremium] = useState<DireitoPremium | null>(null);
  const [erroPlano, setErroPlano] = useState<string | null>(null);

  const carregarPlano = useCallback(async () => {
    setErroPlano(null);
    try {
      const res = await obterDireitoPremium();
      setDireitoPremium(res);
    } catch (err: any) {
      setDireitoPremium(null);
      setErroPlano(err?.message || 'Não foi possível verificar seu plano.');
    }
  }, []);

  useEffect(() => {
    carregarPlano();
  }, [carregarPlano]);

  const plano = planoProp ?? (direitoPremium?.premiumLiberado ? 'PREMIUM' : 'FREE');
  const faixaTrial = formatarFaixaTrial(direitoPremium);
  const avisoTrial = avisoFimTrial(direitoPremium);

  const { idosoId: idosoSelecionadoId, setIdosoId, setNomeIdoso } = useIdoso();
  const idosoSelecionadoRef = useRef<string | null>(idosoSelecionadoId);
  idosoSelecionadoRef.current = idosoSelecionadoId;
  const idosoSelecionado = idosos.find((idoso) => idoso.idosoId === idosoSelecionadoId) ?? null;
  const bateriaBaixa = typeof deviceStatus?.nivelBateria === 'number' && deviceStatus.nivelBateria <= LIMITE_BATERIA_BAIXA;

  // Seleciona o idoso (card ou fallback): atualiza id e nome no contexto.
  const selecionarIdoso = useCallback(
    (idoso: ElderlyProfile | null) => {
      setIdosoId(idoso?.idosoId ?? null);
      setNomeIdoso(idoso?.nome || null);
      if (onSelectElderly) onSelectElderly(idoso?.idosoId ?? null);
    },
    [setIdosoId, setNomeIdoso, onSelectElderly]
  );

  // Lista dos idosos do familiar (HU-008), pelo `sub` da sessão: mantém a seleção atual se ainda existir,
  // senão cai no primeiro. Em erro mostra a falha e limpa a seleção, que não foi confirmada pela API.
  const carregarIdosos = useCallback(async () => {
    try {
      setLoadingIdosos(true);
      setErroIdosos(null);
      const data = await listarIdososDoFamiliar();
      const lista = Array.isArray(data) ? data : [];
      setIdosos(lista);

      const escolhido = escolherIdosoSelecionado(lista, idosoSelecionadoRef.current);
      if (escolhido?.idosoId !== idosoSelecionadoRef.current) {
        selecionarIdoso(escolhido);
      } else if (escolhido) {
        // Mesmo idoso: só garante o nome no contexto.
        setNomeIdoso(escolhido.nome || null);
      }
    } catch (error: any) {
      console.warn('Erro ao carregar idosos na Home:', error?.message);
      setIdosos([]);
      selecionarIdoso(null);
      setErroIdosos(
        extrairMensagemErro(error, 'Não foi possível carregar seus idosos agora. Verifique a conexão e tente de novo.')
      );
    } finally {
      setLoadingIdosos(false);
    }
  }, [selecionarIdoso, setNomeIdoso]);

  useEffect(() => {
    carregarIdosos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status do celular, telemetria e score do idoso SELECIONADO (HU-027, HU-028, HU-031, HU-032 e HU-033).
  useEffect(() => {
    if (!idosoSelecionadoId || !idosoSelecionado) {
      setDeviceStatus(null);
      setPerdaDados(null);
      setTelemetria(null);
      setScoreData(null);
      setConsentimentosIdoso(null);
      return;
    }

    let ativo = true;
    const nomeAlvo = idosoSelecionado.nome || 'o idoso';
    async function carregarDadosDoIdoso(id: string) {
      try {
        const status = await buscarStatusDispositivo(id);
        if (!ativo) return;
        setDeviceStatus(status);
        setPerdaDados(verificarPerdaDados(status.ultimaSincronizacao, nomeAlvo, 3));

        const estadoTelemetria = await buscarEstadoAtual(id);
        if (!ativo) return;
        setTelemetria(estadoTelemetria);

        const scoreResult = await buscarScoreBemEstar(id, plano);
        if (!ativo) return;
        setScoreData(scoreResult);

        try {
          const consent = await obterConsentimentos(id);
          if (ativo) setConsentimentosIdoso(consent);
        } catch (consentErr: any) {
          console.warn('[HomeScreen] Erro ao carregar consentimentos do idoso:', consentErr?.message);
        }
      } catch (error: any) {
        console.warn('Erro ao carregar dados do idoso na Home:', error?.message);
      }
    }

    carregarDadosDoIdoso(idosoSelecionadoId);
    return () => {
      ativo = false;
    };
  }, [idosoSelecionadoId, idosoSelecionado?.nome, plano]);

  const handleAssumirResgate = () => {
    if (!resgateAtivo) {
      Alert.alert(
        'Assumir Comando de Resgate?',
        'Ao assumir, você se torna o socorrista responsável. Os outros cuidadores serão informados e você terá acesso rápido aos canais de urgência.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Assumir Resgate',
            style: 'default',
            onPress: async () => {
              const idosoId = idosoSelecionado?.idosoId;
              const nomeIdoso = idosoSelecionado?.nome || 'o idoso';
              if (!idosoId) {
                Alert.alert('Resgate', 'Nenhum idoso vinculado para assumir o chamado.');
                return;
              }
              try {
                // Só vale o chamado real do servidor: sem SOS em aberto, não há o que assumir.
                const alarme = await obterAlarmeAtivo(idosoId);
                if (!alarme) {
                  Alert.alert('Resgate', `Não há chamado de SOS em aberto para ${nomeIdoso}.`);
                  return;
                }
                if (alarme.status === 'EM_ATENDIMENTO') {
                  setAlarmeIdAtivo(alarme.id);
                  Alert.alert('Resgate', 'Outro familiar já assumiu este chamado.');
                  return;
                }
                await atualizarStatusAlarme(
                  alarme.id,
                  'EM_ATENDIMENTO',
                  'Familiar assumiu o resgate pelo Painel Familiar.'
                );
                setAlarmeIdAtivo(alarme.id);
                setResgateAtivo(true);
              } catch (erro: any) {
                Alert.alert('Resgate', erro?.message || 'Não foi possível assumir o chamado agora. Tente de novo ou ligue.');
                return;
              }

              Alert.alert(
                'Comando Assumido!',
                `Você assumiu o socorro de ${nomeIdoso}. Escolha a ação imediata:`,
                [
                  {
                    text: 'Ligar para o Idoso',
                    onPress: () => {
                      Alert.alert('Discador', `Chamando ${nomeIdoso}...`);
                    },
                  },
                  {
                    text: 'Ligar para SAMU (192)',
                    onPress: () => {
                      Alert.alert('Emergência', 'Disque 192 no seu celular.');
                    },
                  },
                  { text: 'Ok', style: 'cancel' },
                ]
              );
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Concluir Resgate',
        'Deseja encerrar este protocolo de emergência?',
        [
          { text: 'Manter Ativo', style: 'cancel' },
          {
            text: 'Encerrar Resgate',
            style: 'destructive',
            onPress: async () => {
              try {
                if (alarmeIdAtivo) {
                  await atualizarStatusAlarme(
                    alarmeIdAtivo,
                    'RESOLVIDO',
                    'Resgate concluído com sucesso pelo cuidador.'
                  );
                }
              } catch (erro: any) {
                Alert.alert('Resgate', erro?.message || 'Não foi possível encerrar o chamado agora. Tente de novo.');
                return;
              }
              setResgateAtivo(false);
              setAlarmeIdAtivo(null);
              Alert.alert(
                'Resgate Encerrado',
                'O chamado foi encerrado no servidor.'
              );
            },
          },
        ]
      );
    }
  };

  const handleVerContatos = () => {
    if (onNavigate) {
      onNavigate('EmergencyContacts');
    }
  };

  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO */}
      <AppHeader
        title="Início"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: espacoInferior }]}
        showsVerticalScrollIndicator={false}
      >
        {loadingIdosos ? (
          <ActivityIndicator color={colors.primary} size="small" style={{ marginVertical: 24 }} />
        ) : erroIdosos ? (
          <View style={styles.erroIdososCard} testID="home-erro-idosos">
            <Icon name="warning" size={22} color={colors.coralDark} />
            <Text style={styles.erroIdososTexto}>{erroIdosos}</Text>
            <Button
              title="Tentar novamente"
              iconLeft="refresh"
              variant="secondary"
              fullWidth={false}
              onPress={carregarIdosos}
            />
          </View>
        ) : idosos.length === 0 ? (
          <SemIdosoCard onNavigate={onNavigate} />
        ) : (
          <>
            {/* AVISO DE PERDA DE DADOS (HU-028) */}
        {perdaDados && perdaDados.semDados && (
          <TouchableOpacity
            style={styles.dataLossAlertBanner}
            onPress={() => setModalDeviceVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="Aviso de ausência de dados do idoso. Toque para verificar o status do celular."
            accessibilityRole="button"
          >
            <View style={styles.dataLossIconCircle}>
              <Icon name="warning" size={20} color={colors.coralDark} />
            </View>
            <View style={styles.dataLossTextWrapper}>
              <Text style={styles.dataLossTitle}>Aviso de Conexão</Text>
              <Text style={styles.dataLossMessage}>{perdaDados.mensagem}</Text>
            </View>
            <Icon name="chevron_right" size={20} color={colors.coralDark} />
          </TouchableOpacity>
        )}

        {/* CARD 1: IDOSOS DA FAMÍLIA (HU-008), um resumo por idoso (rx=32, #FFFFFF) */}
        {idosos.map((idoso) => (
            <TouchableOpacity
              key={idoso.idosoId}
              style={styles.elderlySummaryCard}
              onPress={() => {
                selecionarIdoso(idoso);
                if (onNavigate) onNavigate('ElderlyProfile');
              }}
              activeOpacity={0.9}
            >
              <View style={styles.elderlyLeft}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.elderlyAvatar, { backgroundColor: colors.infoSurface, justifyContent: 'center', alignItems: 'center' }]}>
                    <Icon name="person" size={26} color={colors.primary} />
                  </View>
                  <View style={styles.onlineBadgeDot} />
                </View>

                <View style={styles.elderlyTexts}>
                  <View style={styles.nameRow}>
                    <Text style={styles.elderlyName}>{idoso.nome}</Text>
                    {calcularIdade(idoso.dataNascimento) !== null && (
                      <View style={styles.ageBadge}>
                        <Text style={styles.ageBadgeText}>{calcularIdade(idoso.dataNascimento)} anos</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Badges empilhados verticalmente à direita com toque para ver status do celular (HU-027) */}
              <TouchableOpacity
                style={styles.elderlyBadgesRight}
                onPress={() => setModalDeviceVisible(true)}
                activeOpacity={0.7}
                accessibilityLabel="Ver status do celular do idoso"
                accessibilityRole="button"
              >
                <View style={styles.telemetryPill}>
                  <Icon
                    name="wifi"
                    size={13}
                    color={perdaDados?.semDados ? colors.amber.text : colors.success}
                  />
                  <Text
                    style={[
                      styles.telemetryText,
                      perdaDados?.semDados && { color: colors.amber.textDark },
                    ]}
                  >
                    {perdaDados?.semDados ? 'Atrasado' : 'Conectado'}
                  </Text>
                </View>
                <View style={styles.telemetryPill}>
                  <Icon
                    name="battery_full"
                    size={13}
                    color={bateriaBaixa ? colors.coralDark : colors.success}
                  />
                  <Text
                    style={[
                      styles.telemetryText,
                      bateriaBaixa && { color: colors.coralDark },
                    ]}
                  >
                    {deviceStatus?.nivelBateria ?? '--'}%
                  </Text>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

        <View style={styles.addElderlyWrapper}>
          <Button
            title="Cadastrar novo idoso"
            iconLeft="person_add"
            variant="outline"
            onPress={() => onNavigate && onNavigate('RegisterElderly')}
            testID="home-cadastrar-idoso"
          />
        </View>

        {/* FAIXA DE PLANO / TRIAL / ERRO DE PLANO (HU-040 a 042) */}
        {erroPlano ? (
          <View style={{ backgroundColor: colors.peach.background, borderRadius: rounded.lg, padding: 14, borderWidth: 1, borderColor: colors.peach.border, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text style={{ flex: 1, fontSize: 14, color: colors.coralDark, ...font('body', 600) }}>{erroPlano}</Text>
            <TouchableOpacity
              onPress={carregarPlano}
              style={{ backgroundColor: colors.primaryNavy, paddingHorizontal: 14, paddingVertical: 10, borderRadius: rounded.full, minHeight: 48, justifyContent: 'center' }}
              activeOpacity={0.85}
            >
              <Text style={{ color: colors.white, fontSize: 14, ...font('body', 700) }}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (faixaTrial || avisoTrial) ? (
          <TouchableOpacity
            onPress={() => onNavigate && onNavigate('Premium')}
            style={{ backgroundColor: colors.amber.background, borderRadius: rounded.lg, padding: 14, borderWidth: 1, borderColor: colors.amber.border, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}
            activeOpacity={0.85}
          >
            <Text style={{ flex: 1, fontSize: 14, color: colors.amber.textDark, ...font('body', 700) }}>
              {avisoTrial || faixaTrial}
            </Text>
            <Text style={{ fontSize: 14, color: colors.primaryNavy, ...font('body', 700) }}>Conhecer o Premium</Text>
          </TouchableOpacity>
        ) : null}

        {/* CARD 2: SEMÁFORO DO BEM-ESTAR (HU-032, HU-033, RN-008, RN-016, RN-017) */}
        {scoreData?.requerPremium ? (
          /* PAYWALL NO PLANO FREE (HU-032 / HU-034 Cenário 3 / RN-014) */
          <View style={styles.paywallCard}>
            <View style={styles.paywallHeader}>
              <View style={styles.paywallIconCircle}>
                <Icon name="vital_signs" size={20} color={colors.lavender.text} />
              </View>
              <View style={styles.paywallTag}>
                <Text style={styles.paywallTagText}>PLANO PREMIUM</Text>
              </View>
            </View>
            <Text style={styles.paywallTitle}>Semáforo do Bem-Estar com IA</Text>
            <Text style={styles.paywallMessage}>{scoreData.beneficioPaywall}</Text>
            <Button
              title="Conhecer o Premium"
              iconRight="chevron_right"
              variant="primary"
              onPress={() => onNavigate && onNavigate('Premium')}
              accessibilityLabel="Conhecer o Premium"
            />
          </View>
        ) : scoreData?.rotinaEmConstrucao ? (
          /* POUCO HISTÓRICO - CONHECENDO A ROTINA (HU-032 Cenário 3 / RN-016) */
          <View style={styles.rotinaCard}>
            <View style={styles.rotinaHeader}>
              <View style={styles.rotinaIconCircle}>
                <Icon name="psychology" size={20} color={colors.primaryNavy} />
              </View>
              <View style={styles.rotinaBadge}>
                <Text style={styles.rotinaBadgeText}>CALIBRANDO IA</Text>
              </View>
            </View>
            <Text style={styles.rotinaTitle}>{scoreData.mensagemRotina}</Text>
            <Text style={styles.rotinaSubtext}>
              A IA do SeniorInsight precisa de pelo menos 3 dias de dados para estabelecer
              uma linha de base confiável e prevenir falsos alarmes.
            </Text>
            <View style={styles.rotinaProgressTrack}>
              <View
                style={[
                  styles.rotinaProgressFill,
                  { width: `${scoreData.progressoPercentual || 33}%` },
                ]}
              />
            </View>
            <Text style={styles.rotinaDaysLabel}>
              {scoreData.diasComDados} de 3 dias de monitoramento concluídos
            </Text>
          </View>
        ) : (
          /* SEMÁFORO COM FAIXAS DINÂMICAS DA RN-008 E TOQUE PARA O MOTIVO (HU-033) */
          <View
            style={[
              styles.semaforoCard,
              {
                backgroundColor: scoreData?.faixa?.corFundo || colors.mint.background,
                borderColor: scoreData?.faixa?.corBorda || colors.mint.border,
              },
            ]}
          >
            <View
              style={[
                styles.semaforoGlow,
                { backgroundColor: scoreData?.faixa?.cor || colors.success },
              ]}
            />

            <View style={styles.semaforoHeader}>
              <View style={styles.semaforoTitleGroup}>
                <View style={styles.semaforoIconBadge}>
                  <Icon
                    name="vital_signs"
                    size={18}
                    color={scoreData?.faixa?.corTexto || colors.mint.textDark}
                  />
                </View>
                <Text
                  style={[
                    styles.semaforoTitle,
                    { color: scoreData?.faixa?.corTexto || colors.mint.textDark },
                  ]}
                >
                  Semáforo do Bem-Estar
                </Text>
              </View>
              <View style={styles.tempoRealBadge}>
                <Text
                  style={[
                    styles.tempoRealTag,
                    { color: scoreData?.faixa?.corTexto || colors.mint.textDark },
                  ]}
                >
                  TEMPO REAL
                </Text>
              </View>
            </View>

            {/* Card branco interno tocável para ver motivo em linguagem simples (HU-033) */}
            <TouchableOpacity
              style={styles.statusInnerCard}
              onPress={() => setModalSemaforoVisible(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Semáforo: ${scoreData?.faixa?.titulo || 'Estável'}. Toque para entender o motivo.`}
            >
              <View
                style={[
                  styles.statusOuterCircle,
                  { backgroundColor: scoreData?.faixa?.corFundo || colors.mint.background },
                ]}
              >
                <View
                  style={[
                    styles.statusInnerCircle,
                    { backgroundColor: scoreData?.faixa?.cor || colors.success },
                  ]}
                >
                  <Icon
                    name={scoreData?.faixa?.icone || 'check'}
                    size={20}
                    color={colors.white}
                  />
                </View>
              </View>

              <View style={styles.statusTextsCol}>
                <View style={styles.statusTagRow}>
                  <View
                    style={[
                      styles.statusLiveDot,
                      { backgroundColor: scoreData?.faixa?.cor || colors.success },
                    ]}
                  />
                  <Text style={styles.statusTagLabel}>STATUS ATUAL</Text>
                  <View
                    style={[
                      styles.scoreInlinePill,
                      { backgroundColor: scoreData?.faixa?.cor || colors.success },
                    ]}
                  >
                    <Text style={styles.scoreInlinePillText}>
                      Score {scoreData?.score ?? 18}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.statusMainLabel,
                    { color: scoreData?.faixa?.corTexto || colors.mint.textDark },
                  ]}
                >
                  {resgateAtivo
                    ? 'Alerta em Atendimento'
                    : scoreData?.faixa?.titulo || 'Tudo bem agora'}
                </Text>
                <Text style={styles.statusSubLabel}>
                  {resgateAtivo
                    ? 'Protocolo familiar em andamento'
                    : consentimentosIdoso && statusMonitoramento(consentimentosIdoso) === 'PAUSADO'
                    ? 'Monitoramento pausado pelo idoso'
                    : consentimentosIdoso && statusMonitoramento(consentimentosIdoso) === 'PARCIAL'
                    ? mensagemParaFamilia(consentimentosIdoso)
                    : scoreData?.explicacao?.fatores?.[0] ||
                      'Nenhuma anomalia detectada nas últimas 6h'}
                </Text>

                <View style={styles.touchHintRow}>
                  <Text style={styles.touchHintText}>Toque para ver o motivo</Text>
                  <Icon name="chevron_right" size={14} color={colors.textSecondary} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Submétricas: Batimentos e Último Remédio */}
            <View style={styles.semaforoSubCards}>
              <View style={styles.semaforoSubCard}>
                <View style={styles.subCardHeader}>
                  <Icon name="favorite" size={14} color={colors.coralDark} />
                  <Text style={styles.subCardTitle}>Batimentos</Text>
                </View>
                <View style={styles.subCardValueRow}>
                  <Text style={styles.subCardValue}>
                    {telemetria?.frequenciaCardiaca ?? '--'}
                  </Text>
                  <Text style={styles.subCardUnit}>bpm</Text>
                </View>
              </View>

              <View style={styles.semaforoSubCard}>
                <View style={styles.subCardHeader}>
                  <Icon name="schedule" size={14} color={colors.primaryNavy} />
                  <Text style={styles.subCardTitle}>Último Remédio</Text>
                </View>
                <View style={styles.subCardValueRow}>
                  <Text style={styles.subCardValue}>10:02</Text>
                  <Text style={styles.remedioStatusTag}>Tomado</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* CARD 3: LOCALIZAÇÃO EM TEMPO REAL (rx=32, #FFFFFF) */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View style={styles.mapTitleGroup}>
              <View style={styles.mapPinBadge}>
                <Icon name="location_on" size={18} color={colors.primary} />
              </View>
              <Text style={styles.mapTitle}>Localização em Tempo Real</Text>
            </View>
            <View style={styles.gpsAtivoBadge}>
              <View style={styles.gpsDot} />
              <Text style={styles.gpsAtivoText}>GPS Ativo</Text>
            </View>
          </View>

          {/* Mapa Interativo com Perímetro Seguro, Pino do idoso e Barra de Endereço */}
          <LiveGpsMap
            latitude={-23.55052}
            longitude={-46.633308}
            safeRadiusMeters={120}
            addressTitle="Em casa (Rua das Flores, 142)"
            addressSubtitle="Dentro do Perímetro Seguro"
            onPressCenter={() =>
              Alert.alert(
                'Coordenadas GPS',
                'Latitude: -23.550520\nLongitude: -46.633308\nPrecisão: 5 metros (Excelente)'
              )
            }
          />
        </View>

        {/* SEÇÃO ESTADO ATUAL CONSOLIDADO DO DIA (HU-031 / RF-025) */}
        <View style={styles.telemetrySection}>
          <View style={styles.telemetrySectionHeader}>
            <View style={styles.telemetrySectionTitleRow}>
              <Icon name="monitor_heart" size={18} color={colors.primary} />
              <Text style={styles.telemetrySectionTitle}>Estado Atual do Dia</Text>
            </View>
            <View
              style={[
                styles.telemetrySyncBadge,
                telemetria?.semDadosRecentes && styles.telemetrySyncBadgeAlerta,
              ]}
              accessibilityLabel={`Status de atualização: ${telemetria?.textoAtualizacao || 'Carregando'}`}
            >
              <Icon
                name={telemetria?.semDadosRecentes ? 'warning' : 'schedule'}
                size={12}
                color={telemetria?.semDadosRecentes ? colors.amber.textDark : colors.successDark}
              />
              <Text
                style={[
                  styles.telemetrySyncText,
                  telemetria?.semDadosRecentes && styles.telemetrySyncTextAlerta,
                ]}
              >
                {telemetria?.textoAtualizacao || 'Carregando...'}
              </Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            {/* Card Passos (#FFF1EC, rx=28) */}
            <View
              style={styles.passosCard}
              accessibilityLabel={
                telemetria?.semDadosRecentes
                  ? 'Passos hoje: Sem dados recentes'
                  : `Passos hoje: ${telemetria?.passosHoje ?? 'sem autorização'}${telemetria?.metaPassos ? `. Meta de ${telemetria.metaPassos} passos` : ''}.`
              }
            >
              <View style={styles.metricHeaderRow}>
                <View style={styles.metricIconCircleWhite}>
                  <Icon name="walk" size={18} color={colors.coralDark} />
                </View>
                {telemetria?.metaPassos ? (
                  <View style={styles.metaBadge}>
                    <Text style={styles.metaBadgeText}>Meta {telemetria.metaPassos.toLocaleString('pt-BR')}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.metricLabelPeach}>Passos Hoje</Text>

              {telemetria?.semDadosRecentes ? (
                <View style={styles.semDadosWrapper}>
                  <Text style={styles.semDadosText}>Sem dados recentes</Text>
                  <Text style={styles.semDadosSubtext}>Aguardando sincronização</Text>
                </View>
              ) : (
                <>
                  <View style={styles.metricValueRow}>
                    <Text style={styles.metricValueLarge}>
                      {telemetria?.passosHoje?.toLocaleString('pt-BR') ?? '--'}
                    </Text>
                    <Text style={styles.metricUnitPeach}>passos</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.round((telemetria?.progressoPassos ?? 0) * 100))}%`,
                          backgroundColor: colors.coralDark,
                        },
                      ]}
                    />
                  </View>
                </>
              )}
            </View>

            {/* Card Batimentos (#EBF5FF, rx=28) - Substitui Glicemia (HU-031) */}
            <View
              style={styles.batimentosCard}
              accessibilityLabel={
                telemetria?.semDadosRecentes
                  ? 'Frequência cardíaca: Sem dados recentes'
                  : `Frequência cardíaca: ${telemetria?.frequenciaCardiaca ?? 'sem autorização'} batimentos por minuto.`
              }
            >
              <View style={styles.metricHeaderRow}>
                <View style={styles.metricIconCircleWhite}>
                  <Icon name="favorite" size={18} color={colors.primary} />
                </View>
              </View>
              <Text style={styles.metricLabelSky}>Último Batimento</Text>

              {telemetria?.semDadosRecentes ? (
                <View style={styles.semDadosWrapper}>
                  <Text style={styles.semDadosText}>Sem dados recentes</Text>
                  <Text style={styles.semDadosSubtext}>Aguardando leitura</Text>
                </View>
              ) : (
                <>
                  <View style={styles.metricValueRow}>
                    <Text style={styles.metricValueLarge}>
                      {telemetria?.frequenciaCardiaca ?? '--'}
                    </Text>
                    <Text style={styles.metricUnitSky}>bpm</Text>
                  </View>
                  {telemetria?.frequenciaCardiacaRepouso !== undefined && (
                    <View style={styles.repousoRow}>
                      <Icon name="vital_signs" size={12} color={colors.onSurfaceVariant} />
                      <Text style={styles.repousoText}>
                        Repouso: {telemetria.frequenciaCardiacaRepouso} bpm
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* CARD 5: COMANDO DE RESGATE FAMILIAR */}
        <RescueCommandCard
          onAssumirResgate={handleAssumirResgate}
          onVerContatos={handleVerContatos}
          resgateAtivo={resgateAtivo}
          responsavelNome={nomeUsuario ?? undefined}
        />
          </>
        )}
      </ScrollView>

      {/* MODAL DE STATUS DO CELULAR DO IDOSO (HU-027) */}
      <DeviceStatusModal
        visible={modalDeviceVisible}
        status={deviceStatus}
        nomeIdoso={idosoSelecionado?.nome}
        perdaDados={perdaDados}
        onClose={() => setModalDeviceVisible(false)}
      />

      {/* MODAL EXPLICATIVO DO SEMÁFORO DO BEM-ESTAR (HU-033 e RN-017) */}
      <SemaforoMotivoModal
        visible={modalSemaforoVisible}
        scoreData={scoreData}
        onClose={() => setModalSemaforoVisible(false)}
      />

      {/* BARRA INFERIOR DE NAVEGAÇÃO */}
      <BottomNavBar currentScreen="Home" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  erroIdososCard: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    marginBottom: 16,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.peach.border,
    backgroundColor: colors.peach.background,
  },
  erroIdososTexto: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.coralDark,
    ...font('body', 600),
  },
  addElderlyWrapper: {
    marginBottom: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dataLossAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peach.background,
    borderWidth: 1.5,
    borderColor: colors.peach.border,
    borderRadius: rounded.xl,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  dataLossIconCircle: {
    width: 38,
    height: 38,
    borderRadius: rounded.xl,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataLossTextWrapper: {
    flex: 1,
  },
  dataLossTitle: {
    fontSize: 14,
    color: colors.peach.text,
    ...font('heading', 700),
  },
  dataLossMessage: {
    fontSize: 14,
    color: colors.peach.textDark,
    ...font('body', 400),
    marginTop: 2,
    lineHeight: 16,
  },
  elderlySummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    marginBottom: 18,
    ...shadows.tier2,
  },
  elderlyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  elderlyAvatar: {
    width: 64,
    height: 64,
    borderRadius: rounded.full,
    borderWidth: 2,
    borderColor: colors.success,
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: rounded.input,
    backgroundColor: colors.success,
    borderWidth: 2.5,
    borderColor: colors.white,
  },
  elderlyTexts: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  elderlyName: {
    fontSize: 20,
    color: colors.textPrimary,
    ...font('heading', 800),
  },
  ageBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  ageBadgeText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('heading', 700),
  },
  elderlyBadgesRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    gap: 5,
  },
  telemetryText: {
    fontSize: 14,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  semaforoCard: {
    backgroundColor: colors.mint.background,
    borderRadius: rounded.card,
    padding: 20,
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.tier2,
  },
  semaforoGlow: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 128,
    height: 128,
    borderRadius: rounded.full,
    backgroundColor: colors.success,
    opacity: 0.1,
  },
  semaforoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  semaforoTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  semaforoIconBadge: {
    width: 36,
    height: 36,
    borderRadius: rounded.xl,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  semaforoTitle: {
    fontSize: 18,
    color: colors.mint.textDark,
    ...font('heading', 700),
  },
  tempoRealBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  tempoRealTag: {
    fontSize: 14,
    color: colors.mint.textDark,
    letterSpacing: 0.5,
    ...font('heading', 800),
  },
  statusInnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  statusOuterCircle: {
    width: 48,
    height: 48,
    borderRadius: rounded.card,
    backgroundColor: colors.mint.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInnerCircle: {
    width: 36,
    height: 36,
    borderRadius: rounded.xl,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextsCol: {
    flex: 1,
  },
  statusTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  statusLiveDot: {
    width: 8,
    height: 8,
    borderRadius: rounded.sm,
    backgroundColor: colors.success,
  },
  statusTagLabel: {
    fontSize: 14,
    color: colors.successDark,
    letterSpacing: 0.5,
    ...font('heading', 700),
  },
  statusMainLabel: {
    fontSize: 20,
    color: colors.mint.textDark,
    marginBottom: 2,
    ...font('heading', 800),
  },
  statusSubLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 500),
  },
  scoreInlinePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
    marginLeft: 6,
  },
  scoreInlinePillText: {
    color: colors.white,
    fontSize: 14,
    ...font('heading', 800),
  },
  touchHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  touchHintText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  paywallCard: {
    backgroundColor: colors.lavender.background,
    borderRadius: rounded.card,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: colors.lavender.border,
  },
  paywallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paywallIconCircle: {
    width: 40,
    height: 40,
    borderRadius: rounded.xl,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paywallTag: {
    backgroundColor: colors.lavender.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  paywallTagText: {
    fontSize: 14,
    color: colors.lavender.text,
    ...font('heading', 800),
  },
  paywallTitle: {
    fontSize: 18,
    color: colors.lavender.textDark,
    marginBottom: 6,
    ...font('heading', 800),
  },
  paywallMessage: {
    fontSize: 14,
    color: colors.lavender.text,
    lineHeight: 18,
    marginBottom: 16,
    ...font('body', 400),
  },
  paywallButton: {
    height: 52,
    backgroundColor: colors.lavender.text,
    borderRadius: rounded.card,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paywallButtonText: {
    color: colors.white,
    fontSize: 14,
    ...font('heading', 700),
  },
  rotinaCard: {
    backgroundColor: colors.sky.background,
    borderRadius: rounded.card,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: colors.sky.border,
  },
  rotinaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rotinaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: rounded.xl,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotinaBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  rotinaBadgeText: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('heading', 800),
  },
  rotinaTitle: {
    fontSize: 17,
    color: colors.primaryNavy,
    marginBottom: 6,
    ...font('heading', 800),
  },
  rotinaSubtext: {
    fontSize: 14,
    color: colors.primaryNavy,
    lineHeight: 17,
    marginBottom: 14,
    ...font('body', 400),
  },
  rotinaProgressTrack: {
    height: 8,
    borderRadius: rounded.sm,
    backgroundColor: colors.infoSurface,
    overflow: 'hidden',
    marginBottom: 8,
  },
  rotinaProgressFill: {
    height: '100%',
    backgroundColor: colors.primaryNavy,
    borderRadius: rounded.sm,
  },
  rotinaDaysLabel: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('body', 600),
  },
  semaforoSubCards: {
    flexDirection: 'row',
    gap: 12,
  },
  semaforoSubCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: rounded.xl,
    padding: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  subCardTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  subCardValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  subCardValue: {
    fontSize: 18,
    color: colors.textPrimary,
    ...font('heading', 800),
  },
  subCardUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  remedioStatusTag: {
    fontSize: 14,
    color: colors.successDark,
    ...font('heading', 700),
  },
  mapCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    marginBottom: 18,
    ...shadows.tier2,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  mapTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapPinBadge: {
    width: 36,
    height: 36,
    borderRadius: rounded.xl,
    backgroundColor: colors.infoSurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  gpsAtivoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    gap: 6,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: rounded.sm,
    backgroundColor: colors.success,
  },
  gpsAtivoText: {
    fontSize: 14,
    color: colors.mint.textDark,
    ...font('heading', 700),
  },
  mapVisualContainer: {
    height: 176,
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.card,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.72,
  },
  radarOuterCircle: {
    position: 'absolute',
    top: 12,
    width: 112,
    height: 112,
    borderRadius: rounded.full,
    backgroundColor: colors.mint.background,
    borderWidth: 2,
    borderColor: colors.mint.background,
  },
  radarInnerCircle: {
    position: 'absolute',
    top: 36,
    width: 64,
    height: 64,
    borderRadius: rounded.full,
    backgroundColor: colors.mint.background,
  },
  elderlyMapPinWrapper: {
    position: 'absolute',
    top: 42,
    alignItems: 'center',
    zIndex: 5,
  },
  elderlyMapPin: {
    width: 48,
    height: 48,
    borderRadius: rounded.card,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  elderlyPinAvatar: {
    width: 42,
    height: 42,
    borderRadius: rounded.card,
  },
  pinBaseShadow: {
    width: 16,
    height: 6,
    borderRadius: rounded.sm,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  mapAddressBar: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    height: 54,
    backgroundColor: colors.white,
    borderRadius: rounded.lg,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.tier2,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  safeZoneText: {
    fontSize: 14,
    color: colors.successDark,
    ...font('body', 600),
  },
  telemetrySection: {
    marginBottom: 18,
  },
  telemetrySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  telemetrySectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  telemetrySectionTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  telemetrySyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.mint.border,
  },
  telemetrySyncBadgeAlerta: {
    backgroundColor: colors.amber.background,
    borderColor: colors.amber.border,
  },
  telemetrySyncText: {
    fontSize: 14,
    color: colors.successDark,
    ...font('heading', 700),
  },
  telemetrySyncTextAlerta: {
    color: colors.amber.textDark,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  passosCard: {
    flex: 1,
    backgroundColor: colors.peach.background,
    borderRadius: rounded.card,
    padding: 16,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  batimentosCard: {
    flex: 1,
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.card,
    padding: 16,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  glicemiaCard: {
    flex: 1,
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.card,
    padding: 16,
  },
  semDadosWrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  semDadosText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('heading', 700),
  },
  semDadosSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
    ...font('body', 400),
  },
  repousoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  repousoText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    ...font('body', 600),
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIconCircleWhite: {
    width: 36,
    height: 36,
    borderRadius: rounded.xl,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  metaBadgeText: {
    fontSize: 14,
    color: colors.coralDark,
    ...font('heading', 700),
  },
  metricLabelPeach: {
    fontSize: 14,
    color: colors.amber.textDark,
    ...font('body', 600),
  },
  metricLabelSky: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('body', 600),
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  metricValueLarge: {
    fontSize: 22,
    color: colors.textPrimary,
    ...font('heading', 800),
  },
  metricUnitPeach: {
    fontSize: 14,
    color: colors.amber.textDark,
    ...font('body', 700),
  },
  metricUnitSky: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('body', 700),
  },
  progressBarTrack: {
    height: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.white,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rounded.full,
  },
});
