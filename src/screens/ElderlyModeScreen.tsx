import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar, { useEspacoBarraInferior } from '../components/BottomNavBar';
import SosActiveModal from '../components/SosActiveModal';
import { AVISO_SEM_CONTATO, destinoLigacaoEmergencia } from '../services/discagemEmergencia';
import SosHoldButton from '../components/SosHoldButton';
import { usePapel } from '../context/PapelContext';
import { obterAparelhoPareado } from '../services/aparelhoPareadoService';
import Icon from '../components/Icon';
import Button from '../components/Button';
import IconButton from '../components/IconButton';
import { colors, font, rounded, shadows, typography } from '../theme';
import {
  listarRotinas,
  confirmarIngestao,
  RotinaMedicamento,
} from '../services/medicamentoService';
import { obterRotinasDoCache } from '../services/medicamentoDatabase';
import { obterContatosDoCache } from '../services/contatoEmergenciaDatabase';
import {
  atualizarStatusAlarme,
  AlarmeEmergencia,
} from '../services/alarmeSosService';
import { buscarPosicaoSos } from '../services/locationService';
import { lerNivelBateria } from '../services/bateriaService';
import {
  enfileirarSos,
  iniciarCicloEnvio,
  atualizarLocalizacaoSos,
  cancelarFilaSos,
  retomarPendentes,
  SosQueueStatusInfo,
} from '../services/sosQueueService';
import {
  listarContatos,
  ContatoEmergencia,
} from '../services/contatoEmergenciaService';
import { useIdoso } from '../context/IdosoContext';

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/** "Quarta-feira, 14:05" com a hora do aparelho. */
export function formatarDiaHora(data: Date): string {
  const hh = String(data.getHours()).padStart(2, '0');
  const mm = String(data.getMinutes()).padStart(2, '0');
  return `${DIAS_SEMANA[data.getDay()]}, ${hh}:${mm}`;
}

/** Hora atual que se atualiza a cada virada de minuto. */
function useRelogioMinuto(): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval> | undefined;
    const atraso = setTimeout(() => {
      setAgora(new Date());
      intervalo = setInterval(() => setAgora(new Date()), 60000);
    }, 60000 - (Date.now() % 60000));
    return () => {
      clearTimeout(atraso);
      if (intervalo) clearInterval(intervalo);
    };
  }, []);
  return agora;
}

export interface ElderlyModeScreenProps {
  onNavigate?: (screen: string) => void;
  idosoId?: string | null;
  onLogout?: () => void;
}

export default function ElderlyModeScreen({
  onNavigate,
  idosoId: idosoIdProp,
  onLogout,
}: ElderlyModeScreenProps) {
  const espacoInferior = useEspacoBarraInferior();
  // O idoso vem do contexto; a prop `idosoId` serve só de override (testes).
  const { idosoId: idosoIdContexto, nomeIdoso: nomeIdosoContexto } = useIdoso();
  const idosoId = idosoIdProp ?? idosoIdContexto;
  const [idAtivo, setIdAtivo] = useState<string | null>(idosoId || null);
  // Nome do aparelho pareado (se houver); senão o do contexto. Sem nome, a saudação fica neutra.
  const [nomePareado, setNomePareado] = useState<string | null>(null);
  const nomeIdoso = nomePareado || nomeIdosoContexto || null;
  const saudacao = nomeIdoso ? `Olá, ${nomeIdoso}!` : 'Olá!';

  useEffect(() => {
    let mounted = true;
    async function resolverIdentidade() {
      try {
        const pareado = await obterAparelhoPareado();
        if (mounted) {
          if (pareado?.nome) {
            setNomePareado(pareado.nome);
          }
          const idFinal = idosoId || pareado?.idosoId || null;
          setIdAtivo(idFinal);
        }
      } catch (err) {
        console.warn('[ElderlyModeScreen] Erro ao resolver aparelho pareado:', err);
      }
    }
    resolverIdentidade();
    return () => { mounted = false; };
  }, [idosoId]);
  const isIdoso = usePapel() === 'IDOSO';
  const [rotinas, setRotinas] = useState<RotinaMedicamento[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Estados do Botão SOS de 2s e Fila Offline (HU-063, HU-064)
  const [modalSosVisible, setModalSosVisible] = useState<boolean>(false);
  const [alarmeAtivo, setAlarmeAtivo] = useState<AlarmeEmergencia | null>(null);
  const [filaStatus, setFilaStatus] = useState<SosQueueStatusInfo | null>(null);
  const [primeiroContato, setPrimeiroContato] = useState<ContatoEmergencia | null>(null);
  const [contatosEmergencia, setContatosEmergencia] = useState<ContatoEmergencia[]>([]);
  const [disparandoSos, setDisparandoSos] = useState<boolean>(false);
  const agora = useRelogioMinuto();


  useEffect(() => {
    if (!idAtivo) {
      setRotinas([]);
      return;
    }

    // 1. Carrega previamente do SQLite local para exibição instantânea 100% offline (RF-038)
    // Carrega previamente contatos e rotinas do SQLite para exibição instantânea 100% offline
    obterContatosDoCache(idAtivo)
      .then((cachedContatos) => {
        if (cachedContatos && cachedContatos.length > 0) {
          setContatosEmergencia(cachedContatos);
          setPrimeiroContato(cachedContatos[0]);
        }
      })
      .catch((err) => {
        console.warn('[ElderlyModeScreen] Erro ao carregar contatos do cache:', err?.message);
      });

    obterRotinasDoCache(idAtivo)
      .then((cached) => {
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setRotinas(cached as RotinaMedicamento[]);
        }
      })
      .catch((err) => {
        console.warn('[ElderlyModeScreen] Erro ao carregar contatos do cache:', err?.message);
      });

    const idosoIdResolvido = idAtivo;

    // 2. Consulta o gateway em background e sincroniza a agenda
    async function carregar() {
      try {
        setLoading(true);
        const data = await listarRotinas(idosoIdResolvido);
        if (data && Array.isArray(data) && data.length > 0) {
          setRotinas(data);
        }
      } catch (err: any) {
        console.warn('Erro ao carregar rotinas do idoso:', err?.message);
      } finally {
        setLoading(false);
      }
    }

    async function carregarContatos() {
      try {
        const lista = await listarContatos(idosoIdResolvido);
        if (lista && lista.length > 0) {
          setContatosEmergencia(lista);
          setPrimeiroContato(lista[0]);
        }
      } catch (err: any) {
        console.warn('Erro ao carregar contatos:', err?.message);
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
        // Sem contato de emergência cadastrado, liga para o SAMU (192): nunca um número fictício.
        const destino = destinoLigacaoEmergencia(contato);
        Linking.openURL(`tel:${destino.telefone}`).catch((err) => {
          console.warn('[ElderlyModeScreen] Não foi possível abrir a ligação de emergência:', err?.name);
        });
      },
    });
  }, [idAtivo]);


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
        idAtivo || idosoId || '',
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
          nomeIdoso ? `Muito Bem, ${nomeIdoso}!` : 'Muito Bem!',
          `Registramos que você tomou ${nomeMedicamento}. Sua família já foi avisada!`
        );
      }
    } catch (err: any) {
      Alert.alert('Atenção', err?.message || 'Falha ao confirmar medicamento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAudioPrompt = () => {
    if (remedioAtual) {
      Alert.alert(
        'Voz Ativa',
        `"${saudacao} São ${remedioAtual.horario}. Está na hora de tomar seu remédio: ${remedioAtual.medicamentoNome || remedioAtual.nomeMedicamento || 'seu remédio'}, ${remedioAtual.dosagem}. ${remedioAtual.instrucoes || 'Tome com um copo d\'água.'}"`
      );
    } else if (todosTomados) {
      Alert.alert(
        'Voz Ativa',
        `"${saudacao} Todos os seus remédios de hoje já foram tomados. Continue se cuidando e tenha um ótimo dia!"`
      );
    } else {
      Alert.alert(
        'Voz Ativa',
        `"${saudacao} Não há medicamentos pendentes para este horário."`
      );
    }
  };

  const handleTriggerSos = async () => {
    const idSos = idAtivo || idosoId;
    if (!idSos) {
      Alert.alert('Atenção', 'Aparelho sem idoso vinculado. Não foi possível enviar o SOS.');
      return;
    }
    setDisparandoSos(true);
    try {
      // 1. Bateria (leitura local, instantânea). A posição NÃO é esperada: o SOS sai na hora.
      const nivelBateria = await lerNivelBateria();

      // 2. Enfileira imediatamente no SQLite e memória com chave de idempotência UUID única
      const registro = await enfileirarSos(idSos, {
        latitude: null,
        longitude: null,
        nivelBateria,
        observacao: 'SOS acionado pelo idoso (pressão contínua de 2s).',
      });

      const alarmeInicial: AlarmeEmergencia = {
        id: registro.idempotencyKey,
        idempotencyKey: registro.idempotencyKey,
        status: 'DISPARADO',
        criadoEm: new Date(registro.criadoEm).toISOString(),
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

          // Cenário 3: 60s sem resposta -> abre o discador com o contato ou, sem contato, com o SAMU (192).
          const destino = destinoLigacaoEmergencia(contato || primeiroContato);
          Linking.openURL(`tel:${destino.telefone}`).catch(() => {
            Alert.alert(
              'Tempo de Conexão Esgotado',
              destino.semContato
                ? `Não foi possível enviar via internet após 60s. ${AVISO_SEM_CONTATO}`
                : `Não foi possível enviar via internet após 60s. Por favor, ligue para ${destino.nome} (${destino.telefone}).`
            );
          });
        },
      });

      // 4. Continua buscando a posição (até ~20 s) e a manda quando chegar: no próximo POST da fila, se o SOS
      // ainda não saiu, ou por PATCH /api/v1/sos/{id}/localizacao, se já saiu.
      buscarPosicaoSos((coords) => {
        atualizarLocalizacaoSos(registro.idempotencyKey, coords).catch((e: any) =>
          console.warn('[ElderlyModeScreen] Falha ao registrar a posição do SOS:', e?.message)
        );
      });
    } catch (err: any) {
      console.warn('Erro ao disparar SOS:', err?.message);
    } finally {
      setDisparandoSos(false);
    }
  };

  const handleCancelarAlarme = async (chaveOuId = '') => {
    try {
      await cancelarFilaSos(chaveOuId);

      if (alarmeAtivo?.id && !alarmeAtivo.id.startsWith('offline-')) {
        try {
          await atualizarStatusAlarme(
            alarmeAtivo.id,
            'CANCELADO',
            'Idoso cancelou o chamado ("Foi engano") nos primeiros 10 segundos.'
          );
        } catch (e: any) {
          console.warn('Erro ao cancelar alarme no servidor:', e?.message);
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
        title="SOS e remédios"
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: espacoInferior }]}
      >
        {/* CARTÃO DE SAUDAÇÃO (rx=32, #FFFFFF) */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingLeft}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarImage, { backgroundColor: colors.infoSurface, justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="person" size={26} color={colors.primary} />
              </View>
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.greetingTexts}>
              <Text style={styles.greetingSub}>{formatarDiaHora(agora)}</Text>
              <Text style={styles.greetingTitle}>{saudacao}</Text>
            </View>
          </View>

          <IconButton
            icon="volume_up"
            variant="neutral"
            accessibilityLabel="Ouvir lembrete de remédio em voz alta"
            onPress={handleAudioPrompt}
            style={{ backgroundColor: colors.mint.background }}
          />
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
                <Icon name="schedule" size={14} color={colors.primary} />
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
                  <Icon name="water_drop" size={15} color={colors.primaryNavy} />
                  <Text style={styles.instructionText}>
                    {remedioAtual.instrucoes || 'Tomar com 1 copo de água'}
                  </Text>
                </View>
              </View>

              <View style={styles.medicineImageContainer}>
                <View style={styles.yellowCornerDot} />
                <Icon name="medication" size={34} color={colors.primary} />
              </View>
            </View>

            <Button
              title="JÁ TOMEI"
              iconLeft="check_circle"
              variant="success"
              size="xl"
              onPress={handleConfirmarDose}
              loading={actionLoading}
              disabled={actionLoading}
            />
          </View>
        ) : todosTomados ? (
          <View style={styles.allTakenCard}>
            <View style={styles.allTakenBadge}>
              <Text style={styles.allTakenBadgeText}>TUDO CERTO POR HOJE!</Text>
            </View>
            <Text style={styles.allTakenTitle}>{nomeIdoso ? `Parabéns, ${nomeIdoso}!` : 'Parabéns!'}</Text>
            <Text style={styles.allTakenSubtitle}>
              Todos os seus medicamentos de hoje já foram tomados com sucesso.
            </Text>
            <Button
              title="Ver Linha do Tempo de Remédios"
              variant="primary"
              size="xl"
              onPress={() => onNavigate && onNavigate('Medicines')}
            />
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
            <Button
              title="Cadastrar Medicamento"
              variant="primary"
              size="xl"
              onPress={() => onNavigate && onNavigate('Medicines')}
            />
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
              <Icon name="schedule" size={20} color={colors.coralDark} />
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
                  : totalAtivos === 0
                  ? 'Nenhum remédio cadastrado'
                  : 'Ver todos os remédios de hoje'}
              </Text>
            </View>
          </View>
          <Icon name="chevron_right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* CARD 3: SOS EMERGÊNCIA (HU-063 / RN-009) */}
        <View style={styles.sosCard}>
          <View style={styles.sosTopGlow} />

          <View style={styles.sosBannerTag}>
            <Icon name="shield_alert" size={14} color={colors.coralDark} />
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

          {/* PÍLULA DE CUIDADORES AVISADOS (HU-011) */}
          <TouchableOpacity
            style={styles.caregiversRow}
            onPress={() => !isIdoso && onNavigate && onNavigate('EmergencyContacts')}
            disabled={isIdoso}
            activeOpacity={0.85}
            accessibilityLabel="Contatos de emergência notificados em caso de SOS"
          >
            <View style={styles.caregiversAvatars}>
              {contatosEmergencia.length === 0 ? (
                <View style={[styles.miniAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarTxt}>
                    {primeiroContato?.iniciais || 'SOS'}
                  </Text>
                </View>
              ) : (
                contatosEmergencia.map((c, i) => (
                  <View
                    key={c.id || i}
                    style={[
                      styles.miniAvatar,
                      { backgroundColor: c.corAvatar || colors.primary, marginLeft: i > 0 ? -6 : 0 },
                    ]}
                  >
                    <Text style={[styles.avatarTxt, { color: c.corTexto || colors.white }]}>
                      {c.iniciais || 'CO'}
                    </Text>
                  </View>
                ))
              )}
            </View>
            <Text style={styles.caregiversText} numberOfLines={1}>
              {contatosEmergencia.length === 0
                ? 'Nenhum contato cadastrado'
                : contatosEmergencia.length === 1
                ? `${contatosEmergencia[0].nome.split(' ')[0]} avisado(a) em caso de emergência`
                : `${contatosEmergencia.map((c) => c.nome.split(' ')[0]).join(', ')} avisados`}
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
  },
  greetingCard: {
    width: '100%',
    height: 80,
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    ...shadows.tier2,
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
    borderRadius: rounded.card,
    borderWidth: 2,
    borderColor: colors.mint.background,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: rounded.sm,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  greetingTexts: {
    marginLeft: 12,
  },
  greetingSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    ...font('body', 600),
  },
  greetingTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    ...font('heading', 800),
  },
  audioButton: {
    width: 48,
    height: 48,
    borderRadius: rounded.card,
    backgroundColor: colors.mint.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  loadingCardText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  medicineCard: {
    width: '100%',
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.card,
    padding: 24,
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.tier2,
  },
  medicineGlowCircle: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 144,
    height: 144,
    borderRadius: rounded.full,
    backgroundColor: colors.infoSurface,
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
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: rounded.full,
    gap: 6,
  },
  medicineTagText: {
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 0.4,
    ...font('heading', 800),
  },
  todayBadge: {
    backgroundColor: colors.infoSurface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: rounded.full,
  },
  todayBadgeText: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('heading', 700),
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
    color: colors.textPrimary,
    marginBottom: 4,
    lineHeight: 28,
    ...font('heading', 800),
  },
  medicineDosage: {
    fontSize: 16,
    color: colors.primaryNavy,
    marginBottom: 12,
    ...font('body', 600),
  },
  instructionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: rounded.lg,
    gap: 6,
  },
  instructionText: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('heading', 700),
  },
  medicineImageContainer: {
    width: 80,
    height: 80,
    borderRadius: rounded.card,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...shadows.tier2,
  },
  yellowCornerDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: rounded.sm,
    backgroundColor: colors.warning,
  },
  takenButton: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: rounded.full,
    gap: 12,
    ...shadows.tier2,
  },
  checkmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: rounded.lg,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  takenButtonText: {
    color: colors.white,
    fontSize: 20,
    letterSpacing: 0.5,
    ...font('heading', 800),
  },
  allTakenCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  allTakenBadge: {
    backgroundColor: colors.mint.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: rounded.full,
    marginBottom: 10,
  },
  allTakenBadgeText: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.mint.textDark,
  },
  allTakenTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 4,
    ...font('heading', 800),
  },
  allTakenSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    ...font('body', 400),
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
    ...font('heading', 800),
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    ...font('body', 400),
  },
  viewRoutineButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: rounded.full,
  },
  viewRoutineButtonText: {
    color: colors.white,
    fontSize: 14,
    ...font('heading', 700),
  },
  nextCard: {
    height: 76,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    paddingHorizontal: 18,
    marginBottom: 18,
    ...shadows.tier1,
  },
  nextCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clockIconBg: {
    width: 44,
    height: 44,
    borderRadius: rounded.card,
    backgroundColor: colors.peach.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextSubLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    ...font('body', 600),
  },
  nextMainLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  sosCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...shadows.tier2,
  },
  sosTopGlow: {
    position: 'absolute',
    top: -40,
    width: 240,
    height: 112,
    borderRadius: rounded.full,
    backgroundColor: colors.peach.background,
    opacity: 0.5,
  },
  sosBannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peach.background,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: rounded.full,
    marginBottom: 8,
    gap: 6,
  },
  sosBannerText: {
    fontSize: 14,
    color: colors.coralDark,
    ...font('heading', 800),
  },
  sosWarningSubtitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
    ...font('heading', 700),
  },
  sosButtonOuterWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sosOuterRing: {
    width: 208,
    height: 208,
    borderRadius: rounded.full,
    backgroundColor: colors.peach.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosInnerButton: {
    width: 192,
    height: 192,
    borderRadius: rounded.full,
    backgroundColor: colors.coralDark,
    borderWidth: 4,
    borderColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...shadows.tier2,
  },
  sosButtonContainerPressing: {
    transform: [{ scale: 0.96 }],
  },
  sosMainButtonText: {
    fontSize: 22,
    color: colors.white,
    marginTop: 6,
    letterSpacing: 0.5,
    ...font('heading', 800),
  },
  sosSubPill: {
    backgroundColor: colors.coralDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: rounded.full,
    marginTop: 6,
  },
  sosSubPillText: {
    fontSize: 14,
    color: colors.peach.border,
    ...font('heading', 700),
  },
  pressingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.coralDark,
    opacity: 0.92,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: rounded.full,
  },
  countdownNumber: {
    fontSize: 52,
    ...font('body', 700),
    color: colors.white,
  },
  countdownSub: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.white,
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: 170,
    height: 8,
    backgroundColor: colors.peach.border,
    borderRadius: rounded.sm,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.coralDark,
    borderRadius: rounded.sm,
  },
  sosInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sosFooterInstruction: {
    fontSize: 14,
    color: colors.coralDark,
    ...font('heading', 700),
  },
  sosFooterSub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    ...font('body', 400),
  },
  caregiversRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
  },
  caregiversAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  // 32 px: a sigla usa o texto mínimo de 14 px e precisa caber dentro da borda de 2 px.
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarTxt: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.white,
  },
  caregiversText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
});
