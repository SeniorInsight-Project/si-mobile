import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  Heart,
  Bell,
  Wifi,
  Zap,
  Activity,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Crosshair,
  Footprints,
  Droplet,
  Pill,
} from 'lucide-react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import RescueCommandCard from '../components/RescueCommandCard';
import { atualizarStatusAlarme } from '../services/alarmeSosService';

export default function HomeScreen({ onNavigate }) {
  const [resgateAtivo, setResgateAtivo] = useState(false);
  const [alarmeIdAtivo, setAlarmeIdAtivo] = useState(null);

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
                    text: 'Ligar para Dona Maria',
                    onPress: () => Linking.openURL('tel:11987654321'),
                  },
                  {
                    text: 'Ligar para o SAMU 192',
                    onPress: () => Linking.openURL('tel:192'),
                  },
                  { text: 'OK', style: 'cancel' },
                ]
              );
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Finalizar Protocolo de Resgate?',
        'Deseja marcar o atendimento como concluído e normalizar o status do monitoramento?',
        [
          { text: 'Continuar em Resgate', style: 'cancel' },
          {
            text: 'Concluir Resgate',
            style: 'destructive',
            onPress: async () => {
              if (alarmeIdAtivo) {
                await atualizarStatusAlarme(
                  alarmeIdAtivo,
                  'RESOLVIDO',
                  'Atendimento concluído com sucesso pelo cuidador familiar.'
                );
              }
              setResgateAtivo(false);
              setAlarmeIdAtivo(null);
              Alert.alert('Protocolo Finalizado', 'O status de Dona Maria retornou para Estável & Seguro.');
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
      <AppHeader title="Painel Familiar" onNavigate={onNavigate} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARD DO IDOSO MONITORADO */}
        <View style={styles.elderlySummaryCard}>
          <View style={styles.elderlyLeft}>
            <View style={styles.avatarContainer}>
              <Image
                source={require('../../assets/idoso.png')}
                style={styles.elderlyAvatar}
              />
              <View style={styles.onlineBadgeDot} />
            </View>

            <View style={styles.elderlyTexts}>
              <View style={styles.nameRow}>
                <Text style={styles.elderlyName}>Dona Maria</Text>
                <View style={styles.ageBadge}>
                  <Text style={styles.ageBadgeText}>76 anos</Text>
                </View>
              </View>
              <Text style={styles.monitoredBy}>Monitorada por Dr. Ricardo</Text>
            </View>
          </View>

          {/* Badges de Conexão e Bateria */}
          <View style={styles.elderlyBadgesRight}>
            <View style={styles.telemetryPillTeal}>
              <Wifi size={12} color="#0D9488" style={{ marginRight: 4 }} />
              <Text style={styles.telemetryTealText}>Conectado</Text>
            </View>
            <View style={[styles.telemetryPillGreen, { marginTop: 6 }]}>
              <Zap size={12} color="#16A34A" style={{ marginRight: 4 }} />
              <Text style={styles.telemetryGreenText}>88%</Text>
            </View>
          </View>
        </View>

        {/* SEMÁFORO DO BEM-ESTAR (TEMPO REAL) */}
        <View style={styles.semaforoCard}>
          <View style={styles.semaforoHeader}>
            <View style={styles.semaforoTitleGroup}>
              <View style={styles.semaforoIconBadge}>
                <Activity size={16} color="#059669" />
              </View>
              <Text style={styles.semaforoTitle}>Semáforo do Bem-Estar</Text>
            </View>
            <Text style={styles.tempoRealTag}>TEMPO REAL</Text>
          </View>

          {/* Card interno de status */}
          <View style={styles.statusInnerCard}>
            <View style={styles.statusCheckCircle}>
              <CheckCircle2 size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.statusTagLabel}>STATUS ATUAL</Text>
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
                <Heart size={14} color="#10B981" />
                <Text style={styles.subCardTitle}>Batimentos</Text>
              </View>
              <View style={styles.subCardValueRow}>
                <Text style={styles.subCardValue}>74 bpm</Text>
                <View style={styles.normalBadge}>
                  <Text style={styles.normalBadgeText}>N</Text>
                </View>
              </View>
            </View>

            <View style={styles.semaforoSubCard}>
              <View style={styles.subCardHeader}>
                <Pill size={14} color="#10B981" />
                <Text style={styles.subCardTitle}>Último Remédio</Text>
              </View>
              <View style={styles.subCardValueRow}>
                <Text style={styles.subCardValue}>10:02</Text>
                <Text style={styles.remedioStatusTag}>Tomado</Text>
              </View>
            </View>
          </View>
        </View>

        {/* LOCALIZAÇÃO EM TEMPO REAL */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View style={styles.mapTitleGroup}>
              <View style={styles.mapPinBadge}>
                <MapPin size={16} color="#031753" />
              </View>
              <Text style={styles.mapTitle}>Localização em Tempo Real</Text>
            </View>
            <View style={styles.gpsAtivoBadge}>
              <View style={styles.gpsDot} />
              <Text style={styles.gpsAtivoText}>GPS Ativo</Text>
            </View>
          </View>

          {/* Mockup visual de Mapa em estilo vetor com raio de segurança */}
          <View style={styles.mapVisualContainer}>
            {/* Linhas de rua decorativas */}
            <View style={styles.mapStreetH1} />
            <View style={styles.mapStreetH2} />
            <View style={styles.mapStreetV1} />
            <View style={styles.mapStreetV2} />

            {/* Perímetro de segurança circular tracejado */}
            <View style={styles.safeZoneCircle} />

            {/* Pin de localização do idoso */}
            <View style={styles.elderlyMapPin}>
              <Image
                source={require('../../assets/idoso.png')}
                style={styles.elderlyPinAvatar}
              />
            </View>

            {/* Badge de Endereço sobre o mapa */}
            <View style={styles.mapAddressBar}>
              <View style={styles.addressLeft}>
                <ShieldCheck size={18} color="#16A34A" />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.addressText} numberOfLines={1}>
                    Em casa (Rua das Flores, 142)
                  </Text>
                  <Text style={styles.safeZoneText}>
                    Dentro do Perímetro Seguro
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.targetButton}
                activeOpacity={0.8}
                onPress={() =>
                  Alert.alert(
                    'Coordenadas GPS',
                    'Latitude: -23.550520\nLongitude: -46.633308\nPrecisão: 5 metros (Excelente)'
                  )
                }
              >
                <Crosshair size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* MÉTRICAS DE SAÚDE DIÁRIAS (PASSOS E GLICEMIA) */}
        <View style={styles.metricsGrid}>
          {/* Card Passos */}
          <View style={styles.passosCard}>
            <View style={styles.metricHeaderRow}>
              <View style={styles.metricIconCircle}>
                <Footprints size={18} color="#DC2626" />
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>Meta 4k</Text>
              </View>
            </View>
            <Text style={styles.metricLabel}>Passos Hoje</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValueLarge}>3.420</Text>
              <Text style={styles.metricUnit}>passos</Text>
            </View>
            {/* Barra de progresso passos */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '85%', backgroundColor: '#DC2626' }]} />
            </View>
          </View>

          {/* Card Glicemia */}
          <View style={styles.glicemiaCard}>
            <View style={styles.metricHeaderRow}>
              <View style={styles.metricIconCircle}>
                <Droplet size={18} color="#0284C7" />
              </View>
              <View style={styles.otimaBadge}>
                <Text style={styles.otimaBadgeText}>Ótima</Text>
              </View>
            </View>
            <Text style={styles.metricLabel}>Glicemia</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValueLarge}>98</Text>
              <Text style={styles.metricUnit}>mg/dL</Text>
            </View>
            {/* Barra de progresso glicemia */}
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '70%', backgroundColor: '#031753' }]} />
            </View>
          </View>
        </View>

        {/* COMANDO DE RESGATE FAMILIAR */}
        <RescueCommandCard
          onAssumirResgate={handleAssumirResgate}
          onVerContatos={handleVerContatos}
          resgateAtivo={resgateAtivo}
          responsavelNome="Carlos Silva"
        />
      </ScrollView>

      {/* BARRA INFERIOR DE NAVEGAÇÃO COM LUCIDE ICONS */}
      <BottomNavBar currentScreen="Home" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIconButton: {
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
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  logoImg: {
    width: 22,
    height: 22,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  headerMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#031753',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 90,
  },
  elderlySummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  elderlyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  elderlyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  onlineBadgeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  elderlyTexts: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  elderlyName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#031753',
    marginRight: 6,
  },
  ageBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  monitoredBy: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  elderlyBadgesRight: {
    alignItems: 'flex-end',
  },
  telemetryPillTeal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  telemetryTealText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D9488',
  },
  telemetryPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  telemetryGreenText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  semaforoCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  semaforoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  semaforoTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  semaforoIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  semaforoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#031753',
  },
  tempoRealTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  statusInnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  statusCheckCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTagLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  statusMainLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#031753',
    marginVertical: 2,
  },
  statusSubLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  semaforoSubCards: {
    flexDirection: 'row',
    gap: 10,
  },
  semaforoSubCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  subCardTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 6,
  },
  subCardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subCardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#031753',
  },
  normalBadge: {
    backgroundColor: '#DCFCE7',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  normalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  remedioStatusTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapPinBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#031753',
  },
  gpsAtivoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  gpsAtivoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  mapVisualContainer: {
    height: 180,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  mapStreetH1: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  mapStreetH2: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  mapStreetV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 90,
    width: 12,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  mapStreetV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 100,
    width: 14,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  safeZoneCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  elderlyMapPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  elderlyPinAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  mapAddressBar: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#031753',
  },
  safeZoneText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  targetButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  passosCard: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  glicemiaCard: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  metaBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  otimaBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  otimaBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16A34A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#031753',
    marginRight: 4,
  },
  metricUnit: {
    fontSize: 11,
    color: '#64748B',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});