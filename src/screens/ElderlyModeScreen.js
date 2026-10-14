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
  Linking,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import SosActiveModal from '../components/SosActiveModal';
import SosHoldButton from '../components/SosHoldButton';
import Icon from '../components/Icon';
import { colors, typography } from '../theme';
import {
  listarRotinas,
  confirmarIngestao,
  INITIAL_MEDICINES,
} from '../services/medicamentoService.js';
import { obterRotinasDoCache } from '../services/medicamentoDatabase.js';
import {
  atualizarStatusAlarme,
} from '../services/alarmeSosService.js';
import { obterLocalizacaoRapida } from '../services/locationService.js';
import {
  enfileirarSos,
  iniciarCicloEnvio,
  cancelarFilaSos,
  retomarPendentes,
} from '../services/sosQueueService.js';
import { listarContatos } from '../services/contatoEmergenciaService.js';

const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function ElderlyModeScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
}) {
  const [rotinas, setRotinas] = useState(INITIAL_MEDICINES);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Estados do Botão SOS de 2s e Fila Offline (HU-063, HU-064)
  const [modalSosVisible, setModalSosVisible] = useState(false);
  const [alarmeAtivo, setAlarmeAtivo] = useState(null);
  const [filaStatus, setFilaStatus] = useState(null);
  const [primeiroContato, setPrimeiroContato] = useState(null);
  const [disparandoSos, setDisparandoSos] = useState(false);


  useEffect(() => {
    // 1. Carrega previamente do SQLite local para exibição instantânea 100% offline (RF-038)
    obterRotinasDoCache(idosoId)
      .then((cached) => {
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setRotinas(cached);
        }
      })
      .catch(() => {});

    // 2. Consulta o gateway em background e sincroniza a agenda
    async function carregar() {
      try {
        setLoading(true);
        const data = await listarRotinas(idosoId);
        if (data && Array.isArray(data) && data.length > 0) {
          setRotinas(data);
        }
      } catch (err) {
        console.warn('Erro ao carregar rotinas do idoso:', err.message);
      } finally {
        setLoading(false);
      }
    }

    async function carregarContatos() {
      try {
        const lista = await listarContatos(idosoId);
        if (lista && lista.length > 0) {
          setPrimeiroContato(lista[0]);
        }
      } catch (err) {
        console.warn('Erro ao carregar contatos:', err.message);
      }
    }

    carregar();
    carregarContatos();

    // Retoma qualquer SOS pendente que tenha ficado no SQLite (ex: app fechado na janela de 60s)
    retomarPendentes({
      onStatusChange: (statusInfo) => {
        setFilaStatus(statusInfo);
      },
      onTimeout: ({ primeiroContato: contato }) => {
        if (contato) setPrimeiroContato(contato);
        const telSanitizado = (contato?.telefone || '11987654321').replace(/\D/g, '');
        Linking.openURL(`tel:${telSanitizado}`).catch(() => {});
      },
    });
  }, [idosoId]);


  const remedioAtual = useMemo(() => {
    return rotinas.find((r) => r.statusHoje !== 'TOMADO' && r.ativo !== false);
  }, [rotinas]);

  const todosTomados = useMemo(() => {
    const ativos = rotinas.filter((r) => r.ativo !== false);
    return ativos.length > 0 && ativos.every((r) => r.statusHoje === 'TOMADO');
  }, [rotinas]);

  const proximoRemedio = useMemo(() => {
    const pendentes = rotinas.filter(
      (r) => r.statusHoje !== 'TOMADO' && r.ativo !== false
    );
    if (pendentes.length > 1) {
      return pendentes[1];
    }
    return null;
  }, [rotinas]);

  const totalAtivos = useMemo(() => {
    return rotinas.filter((r) => r.ativo !== false).length;
  }, [rotinas]);

  const handleConfirmarDose = async () => {
    if (!remedioAtual) return;

    try {
      setActionLoading(true);
      const res = await confirmarIngestao(
        idosoId,
        remedioAtual.id,
        'Idoso confirmou com 1 toque no Modo Idoso.'
      );

      if (res && (res.sucesso || res.status === 'TOMADO')) {
        const horaRegistrada =
          res.horarioIngestaoHoje ||
          new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });

        setRotinas((prev) =>
          prev.map((item) =>
            item.id === remedioAtual.id
              ? {
                  ...item,
                  statusHoje: 'TOMADO',
                  horarioIngestaoHoje: horaRegistrada,
                }
              : item
          )
        );

        const nomeMedicamento =
          remedioAtual.medicamentoNome ||
          remedioAtual.nomeMedicamento ||
          'o medicamento';

        Alert.alert(
          'Muito Bem, Dona Maria! 🎉',
          `Registramos que você tomou ${nomeMedicamento}. Sua família já foi avisada!`
        );
      }
    } catch (err) {
      Alert.alert('Atenção', err.message || 'Falha ao confirmar medicamento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAudioPrompt = () => {
    if (remedioAtual) {
      Alert.alert(
        'Voz Ativa 🗣️',
        `"Olá, Dona Maria! São ${remedioAtual.horario}. Está na hora de tomar seu remédio: ${remedioAtual.medicamentoNome || remedioAtual.nomeMedicamento || 'seu remédio'}, ${remedioAtual.dosagem}. ${remedioAtual.instrucoes || 'Tome com um copo d\'água.'}"`
      );
    } else if (todosTomados) {
      Alert.alert(
        'Voz Ativa 🗣️',
        '"Olá, Dona Maria! Todos os seus remédios de hoje já foram tomados. Continue se cuidando e tenha um ótimo dia!"'
      );
    } else {
      Alert.alert(
        'Voz Ativa 🗣️',
        '"Olá, Dona Maria! Não há medicamentos pendentes para este horário."'
      );
    }
  };

  const handleTriggerSos = async () => {
    setDisparandoSos(true);
    try {
      // 1. Obtém localização rápida (cache ou 1.5s timeout, sem bloqueio de geocoding reverso)
      const loc = await obterLocalizacaoRapida();

      // 2. Enfileira imediatamente no SQLite e memória com chave de idempotência UUID única
      const registro = await enfileirarSos(idosoId, {
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        nivelBateria: null,
        observacao: 'SOS acionado pelo idoso (pressão contínua de 2s).',
      });

      const alarmeInicial = {
        id: registro.idempotencyKey,
        idempotencyKey: registro.idempotencyKey,
        status: 'DISPARADO',
        criadoEm: new Date(registro.criadoEm).toISOString(),
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      };
      setAlarmeAtivo(alarmeInicial);
      setFilaStatus({
        status: 'ENVIANDO',
        tempoRestanteSegundos: 60,
        tentativas: 1,
        idempotencyKey: registro.idempotencyKey,
      });
      setModalSosVisible(true);

      // 3. Inicia ciclo de envio com reenvio contínuo por até 60s com a mesma chave de idempotência
      iniciarCicloEnvio(registro.idempotencyKey, {
        onStatusChange: (statusInfo) => {
          setFilaStatus(statusInfo);
        },
        onSucesso: (alarmeServidor) => {
          setAlarmeAtivo(alarmeServidor);
          setFilaStatus({ status: 'ENVIADO', tempoRestanteSegundos: 0 });
        },
        onTimeout: ({ primeiroContato: contato }) => {
          setFilaStatus({ status: 'EXPIRADO', tempoRestanteSegundos: 0 });
          if (contato) setPrimeiroContato(contato);

          const destino = contato || primeiroContato;
          const telSanitizado = (destino?.telefone || '11987654321').replace(/\D/g, '');

          // Cenário 3: 60s sem resposta -> abre discador telefônico
          Linking.openURL(`tel:${telSanitizado}`).catch(() => {
            Alert.alert(
              'Tempo de Conexão Esgotado',
              `Não foi possível enviar via internet após 60s. Por favor, ligue para ${destino?.nome || 'seu contato de emergência'}.`
            );
          });
        },
      });
    } catch (err) {
      console.warn('Erro ao disparar SOS:', err.message);
    } finally {
      setDisparandoSos(false);
    }
  };

  const handleCancelarAlarme = async (chaveOuId) => {
    try {
      await cancelarFilaSos(chaveOuId);

      if (alarmeAtivo?.id && !alarmeAtivo.id.startsWith('offline-')) {
        try {
          await atualizarStatusAlarme(
            alarmeAtivo.id,
            'CANCELADO',
            'Idoso cancelou o chamado ("Foi engano") nos primeiros 10 segundos.'
          );
        } catch (e) {
          console.warn('Erro ao cancelar alarme no servidor:', e.message);
        }
      }

      setModalSosVisible(false);
      setAlarmeAtivo(null);
      setFilaStatus(null);

      Alert.alert(
        'Alarme Cancelado',
        'Seu pedido de socorro foi cancelado e seus familiares foram avisados que você está em segurança.'
      );
    } catch (err) {
      setModalSosVisible(false);
    }
  };


  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO */}
      <AppHeader
        title="Modo Idoso Alarme Sos"
        subtitle="CUIDADO ATIVO"
        onNavigate={onNavigate}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CARTÃO DE SAUDAÇÃO (rx=32, #FFFFFF) */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingLeft}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarImage, { backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="person" size={26} color="#031753" />
              </View>
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
            <Icon name="volume_up" size={22} color="#003B26" />
          </TouchableOpacity>
        </View>

        {/* CARD 1: HORA DO REMÉDIO (#EBF5FF, rx=32) */}
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingCardText}>
              Carregando horários dos remédios...
            </Text>
          </View>
        ) : remedioAtual ? (
          <View style={styles.medicineCard}>
            <View style={styles.medicineGlowCircle} />

            {/* Linha superior: HORA DO REMÉDIO + Hoje */}
            <View style={styles.medicineHeader}>
              <View style={styles.medicineTag}>
                <Icon name="schedule" size={14} color="#031753" />
                <Text style={styles.medicineTagText}>
                  HORA DO REMÉDIO • {remedioAtual.horario}
                </Text>
              </View>
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>Hoje</Text>
              </View>
            </View>

            {/* Corpo em 2 colunas conforme o .fig: esquerda textos + pílula de água, direita box 80x80 */}
            <View style={styles.medicineBody}>
              <View style={styles.medicineLeftCol}>
                <Text style={styles.medicineName}>
                  {remedioAtual.medicamentoNome || remedioAtual.nomeMedicamento || 'Medicamento'}
                </Text>
                <Text style={styles.medicineDosage}>
                  {remedioAtual.dosagem}
                </Text>

                <View style={styles.instructionBubble}>
                  <Icon name="water_drop" size={15} color="#2D418A" />
                  <Text style={styles.instructionText}>
                    {remedioAtual.instrucoes || 'Tomar com 1 copo de água'}
                  </Text>
                </View>
              </View>

              <View style={styles.medicineImageContainer}>
                <View style={styles.yellowCornerDot} />
                <Icon name="medication" size={34} color="#031753" />
              </View>
            </View>

            {/* BOTÃO JÁ TOMEI (#10B981, height 64, rx=32) */}
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
                    <Icon name="check" size={18} color="#10B981" />
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
            <View style={{ marginBottom: 8 }}>
              <Icon name="medication" size={32} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum remédio cadastrado</Text>
            <Text style={styles.emptySubtitle}>
              Peça a um familiar para cadastrar sua rotina na aba Remédios.
            </Text>
            <TouchableOpacity
              style={styles.viewRoutineButton}
              onPress={() => onNavigate && onNavigate('Medicines')}
              activeOpacity={0.85}
            >
              <Text style={styles.viewRoutineButtonText}>
                Cadastrar Medicamento
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CARD 2: PRÓXIMO HORÁRIO (rx=32, #FFFFFF) */}
        <TouchableOpacity
          style={styles.nextCard}
          onPress={() => onNavigate && onNavigate('Medicines')}
          activeOpacity={0.85}
        >
          <View style={styles.nextCardLeft}>
            <View style={styles.clockIconBg}>
              <Icon name="schedule" size={20} color="#B51C13" />
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
                  ? `${proximoRemedio.horario} — ${proximoRemedio.medicamentoNome || proximoRemedio.nomeMedicamento || 'Medicamento'}`
                  : todosTomados
                  ? `${totalAtivos} doses registradas com sucesso`
                  : '14:00 — Vitamina D3 (1 cápsula)'}
              </Text>
            </View>
          </View>
          <Icon name="chevron_right" size={20} color="#64748B" />
        </TouchableOpacity>

        {/* CARD 3: SOS EMERGÊNCIA (HU-063 / RN-009) */}
        <View style={styles.sosCard}>
          <View style={styles.sosTopGlow} />

          <View style={styles.sosBannerTag}>
            <Icon name="shield_alert" size={14} color="#B51C13" />
            <Text style={styles.sosBannerText}>AJUDA DE EMERGÊNCIA</Text>
          </View>
          <Text style={styles.sosWarningSubtitle}>
            Precisa de socorro urgente?
          </Text>

          {/* NOVO BOTÃO SOS CIRCULAR COM ANEL SVG DE 2 SEGUNDOS E HAPTICS */}
          <SosHoldButton
            onTrigger={handleTriggerSos}
            disabled={disparandoSos}
          />

          {/* PÍLULA DE CUIDADORES AVISADOS */}
          <TouchableOpacity
            style={styles.caregiversRow}
            onPress={() => onNavigate && onNavigate('EmergencyContacts')}
            activeOpacity={0.85}
          >
            <View style={styles.caregiversAvatars}>
              <View style={[styles.miniAvatar, { backgroundColor: '#031753' }]}>
                <Text style={styles.avatarTxt}>
                  {primeiroContato?.iniciais || 'CA'}
                </Text>
              </View>
              <View
                style={[
                  styles.miniAvatar,
                  { backgroundColor: '#10B981', marginLeft: -6 },
                ]}
              >
                <Text style={styles.avatarTxt}>RO</Text>
              </View>
              <View
                style={[
                  styles.miniAvatar,
                  { backgroundColor: '#2D418A', marginLeft: -6 },
                ]}
              >
                <Text style={styles.avatarTxt}>DR</Text>
              </View>
            </View>
            <Text style={styles.caregiversText}>
              {primeiroContato
                ? `${primeiroContato.nome.split(' ')[0]}, Roberta e familiares avisados`
                : 'Carlos, Roberta e familiares avisados'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL / TELA "CHAMANDO SUA FAMÍLIA" (HU-063, HU-064) */}
      <SosActiveModal
        visible={modalSosVisible}
        alarme={alarmeAtivo}
        filaStatus={filaStatus}
        primeiroContato={primeiroContato}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  greetingCard: {
    width: '100%',
    height: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E8F8F0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greetingTexts: {
    marginLeft: 12,
  },
  greetingSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  audioButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 18,
  },
  loadingCardText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  medicineCard: {
    width: '100%',
    backgroundColor: '#EBF5FF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  medicineGlowCircle: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: '#D0E8FF',
    opacity: 0.5,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    gap: 6,
  },
  medicineTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#031753',
    letterSpacing: 0.4,
    fontFamily: typography.fontFamily.heading,
  },
  todayBadge: {
    backgroundColor: '#D0E8FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E2E69',
    fontFamily: typography.fontFamily.heading,
  },
  medicineBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  medicineLeftCol: {
    flex: 1,
  },
  medicineName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#131E3D',
    marginBottom: 4,
    lineHeight: 28,
    fontFamily: typography.fontFamily.heading,
  },
  medicineDosage: {
    fontSize: 16,
    color: '#1E2E69',
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: typography.fontFamily.body,
  },
  instructionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  instructionText: {
    fontSize: 13,
    color: '#2D418A',
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  medicineImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  yellowCornerDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
  },
  takenButton: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 32,
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  checkmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  takenButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily.heading,
  },
  allTakenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  allTakenBadge: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 10,
  },
  allTakenBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003B26',
  },
  allTakenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131E3D',
    marginBottom: 4,
    fontFamily: typography.fontFamily.heading,
  },
  allTakenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: typography.fontFamily.body,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131E3D',
    marginBottom: 4,
    fontFamily: typography.fontFamily.heading,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: typography.fontFamily.body,
  },
  viewRoutineButton: {
    backgroundColor: '#031753',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 9999,
  },
  viewRoutineButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  nextCard: {
    height: 76,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 18,
    marginBottom: 18,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  nextCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF1EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
    fontFamily: typography.fontFamily.body,
  },
  nextMainLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  sosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  sosTopGlow: {
    position: 'absolute',
    top: -40,
    width: 240,
    height: 112,
    borderRadius: 120,
    backgroundColor: '#FFEBE7',
    opacity: 0.5,
  },
  sosBannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBE7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    marginBottom: 8,
    gap: 6,
  },
  sosBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B51C13',
    fontFamily: typography.fontFamily.heading,
  },
  sosWarningSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#131E3D',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: typography.fontFamily.heading,
  },
  sosButtonOuterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sosOuterRing: {
    width: 208,
    height: 208,
    borderRadius: 104,
    backgroundColor: '#FFEBE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosInnerButton: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: '#D83729',
    borderWidth: 4,
    borderColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#D83729',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  sosButtonContainerPressing: {
    transform: [{ scale: 0.96 }],
  },
  sosMainButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 6,
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily.heading,
  },
  sosSubPill: {
    backgroundColor: '#B51C13',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 6,
  },
  sosSubPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFCECB',
    fontFamily: typography.fontFamily.heading,
  },
  pressingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(181, 28, 19, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 96,
  },
  countdownNumber: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  countdownSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: 170,
    height: 8,
    backgroundColor: '#FECACA',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D83729',
    borderRadius: 4,
  },
  sosInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sosFooterInstruction: {
    fontSize: 14,
    color: '#B51C13',
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  sosFooterSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    fontFamily: typography.fontFamily.body,
  },
  caregiversRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 9999,
  },
  caregiversAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarTxt: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  caregiversText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
});