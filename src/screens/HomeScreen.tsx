import React, { useEffect, useState } from 'react';
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
import BottomNavBar from '../components/BottomNavBar';
import RescueCommandCard from '../components/RescueCommandCard';
import LiveGpsMap from '../components/LiveGpsMap';
import DeviceStatusModal from '../components/DeviceStatusModal';
import { atualizarStatusAlarme } from '../services/alarmeSosService';
import { listarIdososDoFamiliar, ElderlyProfile } from '../services/elderlyService';
import {
  buscarStatusDispositivo,
  verificarPerdaDados,
  StatusDispositivo,
  ResultadoPerdaDados,
} from '../services/deviceStatusService';
import { buscarEstadoAtual, EstadoAtual } from '../services/telemetryService';
import { typography } from '../theme';

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
  onSelectElderly?: (idosoId: string) => void;
  familiarId?: string;
}

export default function HomeScreen({
  onNavigate,
  onSelectElderly,
  familiarId = 'familiar-dev',
}: HomeScreenProps) {
  const [resgateAtivo, setResgateAtivo] = useState<boolean>(false);
  const [alarmeIdAtivo, setAlarmeIdAtivo] = useState<string | null>(null);
  const [idosos, setIdosos] = useState<ElderlyProfile[]>([]);
  const [loadingIdosos, setLoadingIdosos] = useState<boolean>(false);
  const [deviceStatus, setDeviceStatus] = useState<(StatusDispositivo & { nomeIdoso: string }) | null>(null);
  const [modalDeviceVisible, setModalDeviceVisible] = useState<boolean>(false);
  const [perdaDados, setPerdaDados] = useState<ResultadoPerdaDados | null>(null);
  const [telemetria, setTelemetria] = useState<EstadoAtual | null>(null);

  // Lista dos idosos do familiar (HU-008)
  useEffect(() => {
    async function carregarIdosos() {
      try {
        setLoadingIdosos(true);
        const data = await listarIdososDoFamiliar(familiarId);
        const lista = Array.isArray(data) ? data : [];
        setIdosos(lista);

        // Carrega status do celular do idoso ativo (HU-027 e HU-028)
        const idosoAlvo = lista[0]?.idosoId || 'e3b0c442-98fc-1c14-9afc-432100000001';
        const nomeAlvo = lista[0]?.nome || 'Dona Maria';
        const status = await buscarStatusDispositivo(idosoAlvo);
        setDeviceStatus({ ...status, nomeIdoso: nomeAlvo });
        const checagemPerda = verificarPerdaDados(status.ultimaSincronizacao, nomeAlvo, 3);
        setPerdaDados(checagemPerda);

        // Carrega estado atual da telemetria (HU-031)
        const estadoTelemetria = await buscarEstadoAtual(idosoAlvo);
        setTelemetria(estadoTelemetria);
      } catch (error: any) {
        console.warn('Erro ao carregar idosos na Home:', error?.message);
      } finally {
        setLoadingIdosos(false);
      }
    }

    carregarIdosos();
  }, [familiarId]);

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
              setResgateAtivo(true);
              const mockId = alarmeIdAtivo || `sos-${Date.now()}`;
              setAlarmeIdAtivo(mockId);
              await atualizarStatusAlarme(
                mockId,
                'EM_ATENDIMENTO',
                'Familiar assumiu o resgate pelo Painel Familiar.'
              );

              Alert.alert(
                'Comando Assumido! 🚨',
                'Você assumiu o socorro de Dona Maria. Escolha a ação imediata:',
                [
                  {
                    text: 'Ligar para o Idoso',
                    onPress: () => {
                      Alert.alert('Discador', 'Chamando Dona Maria...');
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
              if (alarmeIdAtivo) {
                await atualizarStatusAlarme(
                  alarmeIdAtivo,
                  'ENCERRADO',
                  'Resgate concluído com sucesso pelo cuidador.'
                );
              }
              setResgateAtivo(false);
              setAlarmeIdAtivo(null);
              Alert.alert(
                'Resgate Encerrado',
                'O status de Dona Maria voltou ao normal.'
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
        title="Início Monitoramento"
        subtitle="CUIDADO ATIVO"
        onNavigate={onNavigate}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
              <Icon name="warning" size={20} color="#B51C13" />
            </View>
            <View style={styles.dataLossTextWrapper}>
              <Text style={styles.dataLossTitle}>Aviso de Conexão</Text>
              <Text style={styles.dataLossMessage}>{perdaDados.mensagem}</Text>
            </View>
            <Icon name="chevron_right" size={20} color="#B51C13" />
          </TouchableOpacity>
        )}

        {/* CARD 1: IDOSOS DA FAMÍLIA (HU-008), um resumo por idoso (rx=32, #FFFFFF) */}
        {loadingIdosos ? (
          <ActivityIndicator color="#031753" size="small" style={{ marginBottom: 18 }} />
        ) : (
          idosos.map((idoso) => (
            <TouchableOpacity
              key={idoso.idosoId}
              style={styles.elderlySummaryCard}
              onPress={() => {
                if (onSelectElderly) onSelectElderly(idoso.idosoId);
                if (onNavigate) onNavigate('ElderlyProfile');
              }}
              activeOpacity={0.9}
            >
              <View style={styles.elderlyLeft}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.elderlyAvatar, { backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' }]}>
                    <Icon name="person" size={26} color="#031753" />
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
                  <Text style={styles.monitoredBy}>Monitorada por Dr. Ricardo</Text>
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
                    color={perdaDados?.semDados ? '#D97706' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.telemetryText,
                      perdaDados?.semDados && { color: '#92400E' },
                    ]}
                  >
                    {perdaDados?.semDados ? 'Atrasado' : 'Conectado'}
                  </Text>
                </View>
                <View style={styles.telemetryPill}>
                  <Icon
                    name="battery_full"
                    size={13}
                    color={(deviceStatus?.nivelBateria ?? 62) <= 20 ? '#B51C13' : '#10B981'}
                  />
                  <Text
                    style={[
                      styles.telemetryText,
                      (deviceStatus?.nivelBateria ?? 62) <= 20 && { color: '#B51C13' },
                    ]}
                  >
                    {deviceStatus?.nivelBateria ?? 62}%
                  </Text>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {!loadingIdosos && idosos.length === 0 && (
          <TouchableOpacity
            style={styles.elderlySummaryCard}
            onPress={() => onNavigate && onNavigate('ElderlyProfile')}
            activeOpacity={0.9}
          >
            <View style={styles.elderlyTexts}>
              <Text style={styles.elderlyName}>Nenhum idoso cadastrado</Text>
              <Text style={styles.monitoredBy}>Acesse o perfil para cadastrar o primeiro idoso.</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* CARD 2: SEMÁFORO DO BEM-ESTAR (#E8F8F0, rx=32) */}
        <View style={styles.semaforoCard}>
          <View style={styles.semaforoGlow} />

          <View style={styles.semaforoHeader}>
            <View style={styles.semaforoTitleGroup}>
              <View style={styles.semaforoIconBadge}>
                <Icon name="vital_signs" size={18} color="#003B26" />
              </View>
              <Text style={styles.semaforoTitle}>Semáforo do Bem-Estar</Text>
            </View>
            <View style={styles.tempoRealBadge}>
              <Text style={styles.tempoRealTag}>TEMPO REAL</Text>
            </View>
          </View>

          {/* Card branco interno: Ícone verde duplo à esquerda + textos à direita */}
          <View style={styles.statusInnerCard}>
            <View style={styles.statusOuterCircle}>
              <View style={styles.statusInnerCircle}>
                <Icon name="check" size={20} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.statusTextsCol}>
              <View style={styles.statusTagRow}>
                <View style={styles.statusLiveDot} />
                <Text style={styles.statusTagLabel}>STATUS ATUAL</Text>
              </View>
              <Text style={styles.statusMainLabel}>
                {resgateAtivo ? 'Alerta em Atendimento' : 'Estável & Seguro'}
              </Text>
              <Text style={styles.statusSubLabel}>
                {resgateAtivo
                  ? 'Protocolo familiar em andamento'
                  : 'Nenhuma anomalia detectada nas últimas 6h'}
              </Text>
            </View>
          </View>

          {/* Submétricas: Batimentos e Último Remédio */}
          <View style={styles.semaforoSubCards}>
            <View style={styles.semaforoSubCard}>
              <View style={styles.subCardHeader}>
                <Icon name="favorite" size={14} color="#D83729" />
                <Text style={styles.subCardTitle}>Batimentos</Text>
              </View>
              <View style={styles.subCardValueRow}>
                <Text style={styles.subCardValue}>74</Text>
                <Text style={styles.subCardUnit}>bpm</Text>
              </View>
            </View>

            <View style={styles.semaforoSubCard}>
              <View style={styles.subCardHeader}>
                <Icon name="schedule" size={14} color="#2D418A" />
                <Text style={styles.subCardTitle}>Último Remédio</Text>
              </View>
              <View style={styles.subCardValueRow}>
                <Text style={styles.subCardValue}>10:02</Text>
                <Text style={styles.remedioStatusTag}>Tomado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* CARD 3: LOCALIZAÇÃO EM TEMPO REAL (rx=32, #FFFFFF) */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View style={styles.mapTitleGroup}>
              <View style={styles.mapPinBadge}>
                <Icon name="location_on" size={18} color="#031753" />
              </View>
              <Text style={styles.mapTitle}>Localização em Tempo Real</Text>
            </View>
            <View style={styles.gpsAtivoBadge}>
              <View style={styles.gpsDot} />
              <Text style={styles.gpsAtivoText}>GPS Ativo</Text>
            </View>
          </View>

          {/* Mapa Interativo com Perímetro Seguro, Pino da Dona Maria e Barra de Endereço */}
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
              <Icon name="monitor_heart" size={18} color="#031753" />
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
                color={telemetria?.semDadosRecentes ? '#92400E' : '#047857'}
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
                  : `Passos hoje: ${telemetria?.passosHoje ?? 0} passos. Meta de 4 mil passos.`
              }
            >
              <View style={styles.metricHeaderRow}>
                <View style={styles.metricIconCircleWhite}>
                  <Icon name="walk" size={18} color="#B51C13" />
                </View>
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>Meta 4k</Text>
                </View>
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
                      {(telemetria?.passosHoje ?? 0).toLocaleString('pt-BR')}
                    </Text>
                    <Text style={styles.metricUnitPeach}>passos</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.round((telemetria?.progressoPassos ?? 0) * 100))}%`,
                          backgroundColor: '#D83729',
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
                  : `Frequência cardíaca: ${telemetria?.frequenciaCardiaca ?? 0} batimentos por minuto.`
              }
            >
              <View style={styles.metricHeaderRow}>
                <View style={styles.metricIconCircleWhite}>
                  <Icon name="favorite" size={18} color="#031753" />
                </View>
                <View style={styles.otimaBadge}>
                  <Text style={styles.otimaBadgeText}>
                    {telemetria?.statusCardiovascular || 'Normal'}
                  </Text>
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
                  <View style={styles.repousoRow}>
                    <Icon name="vital_signs" size={12} color="#475569" />
                    <Text style={styles.repousoText}>
                      Repouso: {telemetria?.frequenciaCardiacaRepouso ?? 64} bpm
                    </Text>
                  </View>
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
          responsavelNome="Carlos Silva"
        />
      </ScrollView>

      {/* MODAL DE STATUS DO CELULAR DO IDOSO (HU-027) */}
      <DeviceStatusModal
        visible={modalDeviceVisible}
        status={deviceStatus}
        perdaDados={perdaDados}
        onClose={() => setModalDeviceVisible(false)}
      />

      {/* BARRA INFERIOR DE NAVEGAÇÃO */}
      <BottomNavBar currentScreen="Home" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  dataLossAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBE5',
    borderWidth: 1.5,
    borderColor: '#FFCDC2',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  dataLossIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataLossTextWrapper: {
    flex: 1,
  },
  dataLossTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    fontFamily: typography.fontFamily.heading,
  },
  dataLossMessage: {
    fontSize: 12,
    color: '#650001',
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
    lineHeight: 16,
  },
  elderlySummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
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
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
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
    fontWeight: '800',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  ageBadge: {
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  ageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: typography.fontFamily.heading,
  },
  monitoredBy: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  elderlyBadgesRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 5,
  },
  telemetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  semaforoCard: {
    backgroundColor: '#E8F8F0',
    borderRadius: 32,
    padding: 20,
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  semaforoGlow: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#10B981',
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
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  semaforoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#003B26',
    fontFamily: typography.fontFamily.heading,
  },
  tempoRealBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  tempoRealTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003B26',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily.heading,
  },
  statusInnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  statusOuterCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInnerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
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
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusTagLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily.heading,
  },
  statusMainLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#003B26',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  statusSubLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  semaforoSubCards: {
    flexDirection: 'row',
    gap: 12,
  },
  semaforoSubCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  subCardTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  subCardValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  subCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  subCardUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  remedioStatusTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    fontFamily: typography.fontFamily.heading,
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
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
    borderRadius: 18,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  gpsAtivoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 6,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  gpsAtivoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#003B26',
    fontFamily: typography.fontFamily.heading,
  },
  mapVisualContainer: {
    height: 176,
    backgroundColor: '#EBF5FF',
    borderRadius: 24,
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
    borderRadius: 56,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  radarInnerCircle: {
    position: 'absolute',
    top: 36,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
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
    borderRadius: 24,
    backgroundColor: '#031753',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  elderlyPinAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  pinBaseShadow: {
    width: 16,
    height: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(3, 23, 83, 0.3)',
    marginTop: 2,
  },
  mapAddressBar: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  safeZoneText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  targetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  telemetrySyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  telemetrySyncBadgeAlerta: {
    backgroundColor: '#FFF8E7',
    borderColor: '#FDE68A',
  },
  telemetrySyncText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    fontFamily: typography.fontFamily.heading,
  },
  telemetrySyncTextAlerta: {
    color: '#92400E',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  passosCard: {
    flex: 1,
    backgroundColor: '#FFF1EC',
    borderRadius: 28,
    padding: 16,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  batimentosCard: {
    flex: 1,
    backgroundColor: '#EBF5FF',
    borderRadius: 28,
    padding: 16,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  glicemiaCard: {
    flex: 1,
    backgroundColor: '#EBF5FF',
    borderRadius: 28,
    padding: 16,
  },
  semDadosWrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  semDadosText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: typography.fontFamily.heading,
  },
  semDadosSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: typography.fontFamily.body,
  },
  repousoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  repousoText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
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
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B51C13',
    fontFamily: typography.fontFamily.heading,
  },
  otimaBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  otimaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D418A',
    fontFamily: typography.fontFamily.heading,
  },
  metricLabelPeach: {
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  metricLabelSky: {
    fontSize: 12,
    color: '#1E2E69',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  metricUnitPeach: {
    fontSize: 11,
    color: '#9A3412',
    fontWeight: '700',
  },
  metricUnitSky: {
    fontSize: 11,
    color: '#1E2E69',
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
});
