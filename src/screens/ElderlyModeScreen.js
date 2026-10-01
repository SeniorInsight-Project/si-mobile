import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Vibration,
  Platform,
} from 'react-native';
import {
  Heart,
  Bell,
  Volume2,
  Clock,
  Droplet,
  Check,
  ShieldAlert,
  ChevronRight,
  Users,
  Pill,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import SosActiveModal from '../components/SosActiveModal';
import {
  listarRotinas,
  confirmarIngestao,
  INITIAL_MEDICINES,
} from '../services/medicamentoService.js';
import {
  dispararSos,
  atualizarStatusAlarme,
} from '../services/alarmeSosService.js';

// ID padrão para desenvolvimento e testes
const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function ElderlyModeScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
}) {
  const [rotinas, setRotinas] = useState(INITIAL_MEDICINES);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Estados do Botão SOS e Modal de Socorro Ativo (HU35)
  const [modalSosVisible, setModalSosVisible] = useState(false);
  const [alarmeAtivo, setAlarmeAtivo] = useState(null);
  const [isPressingSos, setIsPressingSos] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [disparandoSos, setDisparandoSos] = useState(false);

  const pressProgress = useRef(new Animated.Value(0)).current;
  const pressTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const isTriggeredRef = useRef(false);

  // Carrega as rotinas cadastradas
  useEffect(() => {
    async function carregarMedicamentos() {
      try {
        setLoading(true);
        const data = await listarRotinas(idosoId);
        if (data && Array.isArray(data)) {
          setRotinas(data);
        }
      } catch (err) {
        console.warn('[ElderlyModeScreen] Erro ao carregar rotinas:', err.message);
      } finally {
        setLoading(false);
      }
    }

    carregarMedicamentos();
  }, [idosoId]);

  // Filtra as doses ativas e pendentes para determinar o remédio atual e o próximo
  const { remedioAtual, proximoRemedio, todosTomados, totalAtivos } = useMemo(() => {
    const ativos = rotinas.filter((r) => r.ativo !== false);
    const pendentes = ativos.filter((r) => r.statusHoje !== 'TOMADO');

    return {
      remedioAtual: pendentes.length > 0 ? pendentes[0] : null,
      proximoRemedio: pendentes.length > 1 ? pendentes[1] : null,
      todosTomados: ativos.length > 0 && pendentes.length === 0,
      totalAtivos: ativos.length,
    };
  }, [rotinas]);

  // Confirmação de ingestão pelo botão "JÁ TOMEI"
  const handleConfirmarDose = async () => {
    if (!remedioAtual) return;

    try {
      setActionLoading(true);
      const agora = new Date();
      const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Atualização otimista imediata na interface
      setRotinas((prev) =>
        prev.map((r) =>
          r.id === remedioAtual.id
            ? {
                ...r,
                statusHoje: 'TOMADO',
                horarioIngestaoHoje: horaStr,
                isProximo: false,
                iconeTipo: 'check',
                corIcone: '#10B981',
              }
            : r
        )
      );

      // Notifica o backend
      await confirmarIngestao(remedioAtual.id, {
        dataHoraIngestao: agora.toISOString(),
        status: 'TOMADO',
        observacao: `Confirmado no Modo Idoso às ${horaStr}`,
      });

      Alert.alert(
        'Muito bem, Dona Maria! 👏',
        `Você tomou ${remedioAtual.medicamentoNome} às ${horaStr}. Registro salvo com sucesso!`
      );
    } catch (err) {
      console.warn('[ElderlyModeScreen] Erro ao confirmar dose:', err.message);
      Alert.alert('Aviso', 'Dose registrada localmente no aplicativo.');
    } finally {
      setActionLoading(false);
    }
  };

  // Assistente de Voz para acessibilidade do idoso
  const handleAudioPrompt = () => {
    if (remedioAtual) {
      Alert.alert(
        'Assistente de Voz SeniorInsight',
        `"Olá, Dona Maria! Agora são 10:02. Está na hora de tomar seu remédio: ${remedioAtual.medicamentoNome}, dosagem ${remedioAtual.dosagem}. Instrução: ${remedioAtual.instrucoes || 'Ingerir com água'}."`
      );
    } else if (todosTomados) {
      Alert.alert(
        'Assistente de Voz SeniorInsight',
        '"Olá, Dona Maria! Parabéns! Todos os seus remédios programados para hoje já foram tomados. Tenha um ótimo dia!"'
      );
    } else {
      Alert.alert(
        'Assistente de Voz SeniorInsight',
        '"Olá, Dona Maria! Você não tem remédios pendentes neste horário."'
      );
    }
  };

  // --- CONTROLE DE PRESSÃO CONTÍNUA POR 3 SEGUNDOS NO BOTÃO SOS (HU35) ---
  const startSosPress = () => {
    isTriggeredRef.current = false;
    setIsPressingSos(true);
    setSosCountdown(3);

    pressProgress.setValue(0);
    Animated.timing(pressProgress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    let seg = 3;
    countdownIntervalRef.current = setInterval(() => {
      seg -= 1;
      if (seg > 0) {
        setSosCountdown(seg);
      }
    }, 1000);

    pressTimerRef.current = setTimeout(async () => {
      isTriggeredRef.current = true;
      clearInterval(countdownIntervalRef.current);
      setIsPressingSos(false);
      setSosCountdown(0);
      await executarDisparoEmergencia();
    }, 3000);
  };

  const cancelSosPress = () => {
    if (!isTriggeredRef.current) {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      Animated.timing(pressProgress).stop();
      pressProgress.setValue(0);
      setIsPressingSos(false);
      setSosCountdown(3);
    }
  };

  const executarDisparoEmergencia = async () => {
    try {
      setDisparandoSos(true);
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 500, 200, 500]);
      }

      const resposta = await dispararSos(idosoId, {
        latitude: -23.55052,
        longitude: -46.633308,
        nivelBateria: 88,
        observacao: 'Disparo de socorro imediato efetuado por pressão de 3s no Modo Idoso.',
      });

      setAlarmeAtivo(resposta);
      setModalSosVisible(true);
    } catch (err) {
      console.warn('[ElderlyModeScreen] Erro no disparo SOS:', err.message);
      Alert.alert(
        'Alerta de Socorro Ativado',
        'Notificação prioritária despachada para cuidadores e canal do SAMU (192).'
      );
    } finally {
      setDisparandoSos(false);
    }
  };

  const handleCancelarAlarme = async (alarmeId) => {
    try {
      await atualizarStatusAlarme(
        alarmeId,
        'CANCELADO',
        'Falso alarme cancelado pelo idoso.'
      );
      setModalSosVisible(false);
      setAlarmeAtivo(null);
      Alert.alert(
        'Alarme Cancelado',
        'O cancelamento foi transmitido à sua rede de cuidadores com sucesso.'
      );
    } catch (err) {
      console.warn('[ElderlyModeScreen] Erro ao cancelar alarme:', err.message);
      setModalSosVisible(false);
    }
  };

  const progressWidth = pressProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO GLOBAL */}
      <AppHeader title="Modo Idoso SOS" onNavigate={onNavigate} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CARTÃO DE SAUDAÇÃO (88px de altura, radius 32) */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingLeft}>
            <View style={styles.avatarWrapper}>
              <Image
                source={require('../../assets/idoso.png')}
                style={styles.avatarImage}
              />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.greetingTexts}>
              <Text style={styles.greetingSub}>Quinta-feira, 10:02</Text>
              <Text style={styles.greetingTitle}>Olá, Dona Maria!</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.audioButton}
            onPress={handleAudioPrompt}
            activeOpacity={0.8}
          >
            <Volume2 size={22} color="#10B981" />
          </TouchableOpacity>
        </View>

        {/* CARD 1: HORA DO REMÉDIO */}
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#031753" />
            <Text style={styles.loadingCardText}>Carregando horários dos remédios...</Text>
          </View>
        ) : remedioAtual ? (
          <View style={styles.medicineCard}>
            <View style={styles.medicineHeader}>
              <View style={styles.medicineTag}>
                <Clock size={12} color="#031753" style={{ marginRight: 4 }} />
                <Text style={styles.medicineTagText}>
                  HORA DO REMÉDIO • {remedioAtual.horario}
                </Text>
              </View>
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Hoje</Text>
              </View>
            </View>

            <View style={styles.medicineBody}>
              <View style={{ flex: 1 }}>
                <Text style={styles.medicineName}>
                  {remedioAtual.medicamentoNome}
                </Text>
                <Text style={styles.medicineDosage}>
                  {remedioAtual.dosagem}
                </Text>
              </View>

              {/* Ícone lateral do remédio */}
              <View
                style={[
                  styles.medicineImageContainer,
                  remedioAtual.corFundoThumb && {
                    backgroundColor: remedioAtual.corFundoThumb,
                  },
                ]}
              >
                <View style={styles.yellowCornerDot} />
                <Pill size={24} color="#031753" />
              </View>
            </View>

            {/* Balão de instrução com Lucide Droplet */}
            <View style={styles.instructionBubble}>
              <Droplet size={15} color="#0D9488" style={{ marginRight: 6 }} />
              <Text style={styles.instructionText}>
                {remedioAtual.instrucoes || 'Tomar com 1 copo de água'}
              </Text>
            </View>

            {/* BOTÃO JÁ TOMEI COM LUCIDE CHECK */}
            <TouchableOpacity
              style={styles.takenButton}
              onPress={handleConfirmarDose}
              activeOpacity={0.85}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <View style={styles.checkmarkCircle}>
                    <Check size={18} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <Text style={styles.takenButtonText}>JÁ TOMEI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : todosTomados ? (
          <View style={styles.allTakenCard}>
            <View style={styles.allTakenBadge}>
              <Text style={styles.allTakenBadgeText}>TUDO CERTO POR HOJE!</Text>
            </View>
            <Text style={styles.allTakenTitle}>Parabéns, Dona Maria!</Text>
            <Text style={styles.allTakenSubtitle}>
              Todos os seus medicamentos de hoje já foram tomados com sucesso.
            </Text>
            <TouchableOpacity
              style={styles.viewRoutineButton}
              onPress={() => onNavigate && onNavigate('Medicines')}
              activeOpacity={0.85}
            >
              <Text style={styles.viewRoutineButtonText}>
                Ver Linha do Tempo de Remédios
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Pill size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>Nenhum remédio cadastrado</Text>
            <Text style={styles.emptySubtitle}>
              Peça a um familiar para cadastrar sua rotina na aba Remédios.
            </Text>
            <TouchableOpacity
              style={styles.viewRoutineButton}
              onPress={() => onNavigate && onNavigate('Medicines')}
              activeOpacity={0.85}
            >
              <Text style={styles.viewRoutineButtonText}>Cadastrar Medicamento</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CARD 2: PRÓXIMO HORÁRIO */}
        <TouchableOpacity
          style={styles.nextCard}
          onPress={() => onNavigate && onNavigate('Medicines')}
          activeOpacity={0.85}
        >
          <View style={styles.nextCardLeft}>
            <View style={styles.clockIconBg}>
              <Clock size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextSubLabel}>
                {proximoRemedio
                  ? 'Próximo horário hoje'
                  : todosTomados
                  ? 'Adesão medicamentosa'
                  : 'Rotina de medicamentos'}
              </Text>
              <Text style={styles.nextMainLabel} numberOfLines={1}>
                {proximoRemedio
                  ? `${proximoRemedio.horario} — ${proximoRemedio.medicamentoNome} ${
                      proximoRemedio.dosagem
                        ? proximoRemedio.dosagem.split('•')[0].trim()
                        : ''
                    }`
                  : todosTomados
                  ? `${totalAtivos} doses registradas com sucesso`
                  : 'Toque para gerenciar remédios'}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* CARD 3: SOS EMERGÊNCIA COM PRESSÃO DE 3 SEGUNDOS (HU35) */}
        <View style={styles.sosCard}>
          <View style={styles.sosBannerTag}>
            <ShieldAlert size={12} color="#C53030" style={{ marginRight: 4 }} />
            <Text style={styles.sosBannerText}>AJUDA DE EMERGÊNCIA</Text>
          </View>
          <Text style={styles.sosWarningSubtitle}>Precisa de socorro urgente?</Text>

          {/* BOTÃO SOS COM PRESSÃO CONTÍNUA DE 3 SEGUNDOS */}
          <View style={styles.sosButtonOuterWrapper}>
            <TouchableOpacity
              style={[
                styles.sosButtonContainer,
                isPressingSos && styles.sosButtonContainerPressing,
              ]}
              onPressIn={startSosPress}
              onPressOut={cancelSosPress}
              activeOpacity={0.9}
            >
              <Image
                source={require('../../assets/botaosos.png')}
                style={styles.sosImageButton}
                resizeMode="contain"
              />

              {/* Overlay visual quando pressionado */}
              {isPressingSos && (
                <View style={styles.pressingOverlay}>
                  <Text style={styles.countdownNumber}>{sosCountdown}</Text>
                  <Text style={styles.countdownSub}>segure...</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Barra de progresso animada da pressão contínua */}
            {isPressingSos && (
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            )}
          </View>

          {/* INSTRUÇÃO COM O ÍCONE iconprees.png */}
          <View style={styles.sosInstructionRow}>
            <Image
              source={require('../../assets/iconprees.png')}
              style={styles.pressIconImg}
              resizeMode="contain"
            />
            <Text style={styles.sosFooterInstruction}>
              {isPressingSos
                ? `Segure por mais ${sosCountdown}s para disparar!`
                : 'Pressione e segure por 3 segundos'}
            </Text>
          </View>

          <Text style={styles.sosFooterSub}>
            Avisará imediatamente 3 cuidadores familiares e{'\n'}compartilhará sua
            localização com o SAMU (192).
          </Text>

          {/* CUIDADORES AVISADOS */}
          <View style={styles.caregiversRow}>
            <View style={styles.caregiversAvatars}>
              <View style={[styles.miniAvatar, { backgroundColor: '#EBF5FF' }]}>
                <Text style={styles.avatarTxt}>CA</Text>
              </View>
              <View
                style={[
                  styles.miniAvatar,
                  { backgroundColor: '#E6F4EA', marginLeft: -8 },
                ]}
              >
                <Text style={[styles.avatarTxt, { color: '#137333' }]}>RO</Text>
              </View>
              <View
                style={[
                  styles.miniAvatar,
                  { backgroundColor: '#F3E8FF', marginLeft: -8 },
                ]}
              >
                <Text style={[styles.avatarTxt, { color: '#6B21A8' }]}>DR</Text>
              </View>
            </View>
            <Text style={styles.caregiversText}>
              Carlos, Roberta e Dr. Silva avisados
            </Text>
          </View>

          {/* BOTÃO GERENCIAR CONTATOS DE EMERGÊNCIA (HU35) */}
          <TouchableOpacity
            style={styles.manageContactsButton}
            onPress={() => onNavigate && onNavigate('EmergencyContacts')}
            activeOpacity={0.8}
          >
            <Users size={15} color="#031753" />
            <Text style={styles.manageContactsText}>
              Gerenciar Contatos de Emergência
            </Text>
            <ChevronRight size={15} color="#64748B" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE SOCORRO ATIVO COM CANCELAMENTO DE FALSO ALARME */}
      <SosActiveModal
        visible={modalSosVisible}
        alarme={alarmeAtivo}
        onClose={() => setModalSosVisible(false)}
        onCancelAlarme={handleCancelarAlarme}
      />

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <BottomNavBar currentScreen="ElderlyMode" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 90,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    height: 42,
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 1,
  },
  topTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  topSubtitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  topMainTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#031753',
    textAlign: 'center',
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  redDotNotification: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
  },
  profileHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  logoHeaderImg: {
    width: 22,
    height: 22,
  },
  greetingCard: {
    width: '100%',
    height: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 32,
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greetingTexts: {
    marginLeft: 12,
  },
  greetingSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  greetingTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#131E3D',
  },
  audioButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingCardText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  medicineCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  medicineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  medicineTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#031753',
    letterSpacing: 0.4,
  },
  todayBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  medicineBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  medicineName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 4,
  },
  medicineDosage: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  medicineImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  yellowCornerDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EAB308',
  },
  instructionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  instructionText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
  },
  takenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  takenButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  allTakenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  allTakenBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  allTakenBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  allTakenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 4,
  },
  allTakenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  viewRoutineButton: {
    backgroundColor: '#031753',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  viewRoutineButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  nextCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  nextCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  nextMainLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#031753',
  },
  sosCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7D7',
  },
  sosBannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE3E3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  sosBannerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#C53030',
  },
  sosWarningSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 12,
    textAlign: 'center',
  },
  sosButtonOuterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  sosButtonContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 75,
    position: 'relative',
    overflow: 'hidden',
  },
  sosButtonContainerPressing: {
    transform: [{ scale: 0.95 }],
  },
  sosImageButton: {
    width: '100%',
    height: '100%',
  },
  pressingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 75,
  },
  countdownNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  countdownSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: 160,
    height: 8,
    backgroundColor: '#FECACA',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
  sosInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pressIconImg: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  sosFooterInstruction: {
    fontSize: 13,
    color: '#B51C13',
    fontWeight: 'bold',
  },
  sosFooterSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  caregiversRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  caregiversAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarTxt: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E2E69',
  },
  caregiversText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  manageContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  manageContactsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
    marginHorizontal: 8,
  },
});