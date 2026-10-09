import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import BottomNavBar from '../components/BottomNavBar';
import {
  listarRotinas,
  confirmarIngestao,
  INITIAL_MEDICINES,
} from '../services/medicamentoService.js';

// ID padrão para desenvolvimento e testes
const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function ElderlyModeScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
}) {
  const [rotinas, setRotinas] = useState(INITIAL_MEDICINES);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
        'Assistente de Voz SeniorInsight 🔊',
        `"Olá, Dona Maria! Agora são 10:02. Está na hora de tomar seu remédio: ${remedioAtual.medicamentoNome}, dosagem ${remedioAtual.dosagem}. Instrução: ${remedioAtual.instrucoes || 'Ingerir com água'}."`
      );
    } else if (todosTomados) {
      Alert.alert(
        'Assistente de Voz SeniorInsight 🔊',
        '"Olá, Dona Maria! Parabéns! Todos os seus remédios programados para hoje já foram tomados. Tenha um ótimo dia!"'
      );
    } else {
      Alert.alert(
        'Assistente de Voz SeniorInsight 🔊',
        '"Olá, Dona Maria! Você não tem remédios pendentes neste horário."'
      );
    }
  };

  // Acionamento do botão de emergência SOS
  const handleSosPress = () => {
    Alert.alert(
      '🚨 EMERGÊNCIA ACIONADA!',
      'Alerta sonoro e localização GPS enviados imediatamente para seus cuidadores familiares (Carlos, Roberta, Dr. Silva) e canal do SAMU (192).'
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER SUPERIOR */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => onNavigate && onNavigate('Home')}
            activeOpacity={0.8}
          >
            <Text style={styles.heartIcon}>♡</Text>
          </TouchableOpacity>

          <View style={styles.topTitleContainer}>
            <Text style={styles.topSubtitle}>CUIDADO ATIVO</Text>
            <Text style={styles.topMainTitle}>Modo Idoso Alarme Sos</Text>
          </View>

          <View style={styles.topRightIcons}>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Notificações', 'Sem novos alertas no momento.')}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              <View style={styles.redDotNotification} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileHeaderButton}
              onPress={() => onNavigate && onNavigate('ElderlyProfile')}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoHeaderImg}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* CARTÃO DE SAUDAÇÃO IDÊNTICO AO FIGMA (88px de altura, radius 32) */}
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
            <Text style={styles.audioIcon}>🔊</Text>
          </TouchableOpacity>
        </View>

        {/* CARD 1: HORA DO REMÉDIO (REFLETE DINAMICAMENTE OS MEDICAMENTOS CADASTRADOS) */}
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#031753" />
            <Text style={styles.loadingCardText}>Carregando horários dos remédios...</Text>
          </View>
        ) : remedioAtual ? (
          <View style={styles.medicineCard}>
            <View style={styles.medicineHeader}>
              <View style={styles.medicineTag}>
                <Text style={styles.medicineTagText}>
                  ⏰ HORA DO REMÉDIO • {remedioAtual.horario}
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

              {/* Ícone lateral do remédio com o ponto amarelo */}
              <View
                style={[
                  styles.medicineImageContainer,
                  remedioAtual.corFundoThumb && {
                    backgroundColor: remedioAtual.corFundoThumb,
                  },
                ]}
              >
                <View style={styles.yellowCornerDot} />
                <Text style={styles.pillBoxEmoji}>
                  {remedioAtual.thumbEmoji || '💊'}
                </Text>
              </View>
            </View>

            {/* Balão de instrução */}
            <View style={styles.instructionBubble}>
              <Text style={styles.dropIcon}>
                {remedioAtual.tipoFormato === 'xarope'
                  ? '🧴'
                  : remedioAtual.tipoFormato === 'colirio'
                  ? '💧'
                  : '💧'}
              </Text>
              <Text style={styles.instructionText}>
                {remedioAtual.instrucoes || 'Tomar com 1 copo de água'}
              </Text>
            </View>

            {/* BOTÃO JÁ TOMEI */}
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
                    <Text style={styles.checkSymbol}>✓</Text>
                  </View>
                  <Text style={styles.takenButtonText}>JÁ TOMEI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : todosTomados ? (
          <View style={styles.allTakenCard}>
            <View style={styles.allTakenBadge}>
              <Text style={styles.allTakenBadgeText}>🎉 TUDO CERTO POR HOJE!</Text>
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
            <Text style={styles.emptyEmoji}>💊</Text>
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

        {/* CARD 2: PRÓXIMO HORÁRIO (INTERATIVO COM NAVEGAÇÃO PARA REMÉDIOS) */}
        <TouchableOpacity
          style={styles.nextCard}
          onPress={() => onNavigate && onNavigate('Medicines')}
          activeOpacity={0.85}
        >
          <View style={styles.nextCardLeft}>
            <View style={styles.clockIconBg}>
              <Text style={styles.clockEmoji}>⏰</Text>
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
                  ? `${totalAtivos} doses registradas com sucesso ✓`
                  : 'Toque para gerenciar remédios'}
              </Text>
            </View>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </TouchableOpacity>

        {/* CARD 3: SOS EMERGÊNCIA */}
        <View style={styles.sosCard}>
          <View style={styles.sosBannerTag}>
            <Text style={styles.sosBannerText}>✱ AJUDA DE EMERGÊNCIA</Text>
          </View>
          <Text style={styles.sosWarningSubtitle}>Precisa de socorro urgente?</Text>

          {/* BOTÃO SOS COM A IMAGEM botaosos.png */}
          <TouchableOpacity
            style={styles.sosButtonContainer}
            onPress={handleSosPress}
            activeOpacity={0.85}
          >
            <Image
              source={require('../../assets/botaosos.png')}
              style={styles.sosImageButton}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* INSTRUÇÃO COM O ÍCONE iconprees.png AO LADO DO TEXTO VERMELHO */}
          <View style={styles.sosInstructionRow}>
            <Image
              source={require('../../assets/iconprees.png')}
              style={styles.pressIconImg}
              resizeMode="contain"
            />
            <Text style={styles.sosFooterInstruction}>
              Pressione e segure por 3 segundos
            </Text>
          </View>

          <Text style={styles.sosFooterSub}>
            Avisará imediatamente 3 cuidadores familiares e{'\n'}compartilhará sua
            localização com o SAMU (192).
          </Text>

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
        </View>
      </ScrollView>

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
  heartIcon: {
    fontSize: 18,
    color: '#1E2E69',
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
    color: '#1E2E69',
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
  bellIcon: {
    fontSize: 14,
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
  audioIcon: {
    fontSize: 20,
    color: '#10B981',
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
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },
  medicineCard: {
    width: '100%',
    backgroundColor: '#EBF5FF',
    borderRadius: 40,
    padding: 24,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 32,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicineTag: {
    backgroundColor: '#031753',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  medicineTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  todayBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  medicineBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  medicineName: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#031753',
    lineHeight: 28,
  },
  medicineDosage: {
    fontSize: 14,
    color: '#1A285A',
    fontWeight: '600',
    marginTop: 6,
  },
  medicineImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 1,
    marginLeft: 8,
  },
  yellowCornerDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#F59E0B',
  },
  pillBoxEmoji: {
    fontSize: 32,
  },
  instructionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#1A285A',
    fontWeight: '600',
  },
  takenButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 28,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  checkmarkCircle: {
    backgroundColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkSymbol: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: 'bold',
  },
  takenButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  allTakenCard: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderRadius: 36,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
  },
  allTakenBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  allTakenBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  allTakenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 6,
  },
  allTakenSubtitle: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    marginBottom: 18,
    fontWeight: '500',
    lineHeight: 20,
  },
  emptyCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
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
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'solid',
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 16,
    // Elimina qualquer outline azul de foco do navegador (Web / Chrome / Edge)
    outlineStyle: 'none',
    outlineWidth: 0,
    // Elimina o hardware shadow do Android que projeta sombras retangulares em views com borda
    elevation: 0,
    shadowOpacity: 0,
  },
  nextCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    overflow: 'hidden',
  },
  clockEmoji: {
    fontSize: 16,
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
  arrowIcon: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  sosCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7D7',
  },
  sosBannerTag: {
    backgroundColor: '#FFE3E3',
    paddingHorizontal: 12,
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
  sosButtonContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sosImageButton: {
    width: '100%',
    height: '100%',
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
});