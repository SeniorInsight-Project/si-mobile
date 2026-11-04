import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from './Icon';
import { colors, typography, shadows, rounded } from '../theme';
import { AlarmeEmergencia } from '../services/alarmeSosService';
import { SosQueueStatusInfo } from '../services/sosQueueService';
import { ContatoEmergencia } from '../services/contatoEmergenciaService';

export interface SosActiveModalProps {
  visible: boolean;
  alarme?: AlarmeEmergencia | null;
  filaStatus?: SosQueueStatusInfo | null;
  primeiroContato?: ContatoEmergencia | null;
  onClose: () => void;
  onCancelAlarme?: (idOrKey?: string) => void;
  /** Familiar que assumiu o resgate (RN-009). Só vem do servidor; sem ele o cartão não aparece. */
  socorrista?: { nome: string; assumiuEm?: string } | null;
}

/**
 * Tela cheia "Pedido de Socorro" / "Chamando sua família" (Figma "Idoso - SOS Acionado"; HU-063, HU-064, RN-009).
 * - Exibe feedback imediato do SOS disparado.
 * - Suporta cancelamento em até 10 segundos ("Foi engano", HU-064).
 * - Após 10 segundos, exibe "Ajuda a caminho".
 * - Exibe status de reenvio offline (60s) e discagem rápida para o 1º contato.
 */
export default function SosActiveModal({
  visible,
  alarme,
  filaStatus,
  primeiroContato,
  onClose,
  onCancelAlarme,
  socorrista,
}: SosActiveModalProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [segundosCancelamento, setSegundosCancelamento] = useState(10);
  const cancelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animação contínua do ícone de socorro
  useEffect(() => {
    if (visible) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => pulseLoop.stop();
    }
  }, [visible, pulseAnim]);

  // Contagem regressiva de 10 segundos para cancelamento de falso alarme (HU-064)
  useEffect(() => {
    if (visible) {
      setSegundosCancelamento(10);

      cancelTimerRef.current = setInterval(() => {
        setSegundosCancelamento((prev) => {
          if (prev <= 1) {
            if (cancelTimerRef.current) {
              clearInterval(cancelTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (cancelTimerRef.current) {
          clearInterval(cancelTimerRef.current);
          cancelTimerRef.current = null;
        }
      };
    }
  }, [visible]);

  if (!visible) return null;

  const contatoPadrao = primeiroContato || {
    nome: 'Carlos Silva',
    parentesco: 'Filho (Cuidador Principal)',
    telefone: '(11) 98765-4321',
  };

  const handleLigarContato = () => {
    const rawTel = contatoPadrao.telefone || '11987654321';
    const telSanitizado = rawTel.replace(/\D/g, '');
    Linking.openURL(`tel:${telSanitizado}`).catch(() => {
      Alert.alert(
        'Discador Indisponível',
        `Disque manualmente para ${contatoPadrao.nome}: ${contatoPadrao.telefone}`
      );
    });
  };

  const handleFoiEngano = () => {
    if (onCancelAlarme) {
      onCancelAlarme(alarme?.id || alarme?.idempotencyKey);
    }
  };

  const formatarHora = (valor?: string) =>
    (valor ? new Date(valor) : new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isOffline = filaStatus?.status === 'PENDENTE_OFFLINE';
  const isTimeout = filaStatus?.status === 'EXPIRADO';
  const tempoRestante = filaStatus?.tempoRestanteSegundos ?? 60;
  const primeiroNome = (socorrista?.nome || '').split(' ')[0];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Text style={styles.topEyebrow}>CUIDADO ATIVO</Text>
          <Text style={styles.topTitle}>Pedido de Socorro</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Cartão principal: botão SOS pulsante e estado do envio */}
          <View style={styles.heroCard}>
            <Animated.View style={[styles.sosHalo, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[styles.sosButton, isTimeout && styles.sosButtonTimeout]}>
                <Icon name="crisis_alert" size={36} color={colors.white} />
                <Text style={styles.sosButtonText}>SOS</Text>
                <Text style={styles.sosButtonSub}>EMERGÊNCIA</Text>
              </View>
            </Animated.View>

            <Text style={styles.heroTitle}>
              {isTimeout ? 'Sem conexão' : isOffline ? 'Tentando enviar' : 'Chamando sua família'}
            </Text>
            <Text style={styles.heroSub} testID="sos-subtitulo">
              {isTimeout
                ? 'Não conseguimos enviar pela internet. Ligue para o seu contato abaixo.'
                : isOffline
                  ? `Reenviando sozinho (${tempoRestante} s restantes).`
                  : 'Seu pedido foi enviado com a sua localização.'}
            </Text>
          </View>

          {/* Foi engano: 10 s (RN-009 / HU-064) */}
          {segundosCancelamento > 0 ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleFoiEngano}
              activeOpacity={0.8}
              accessibilityRole="button"
              testID="sos-foi-engano"
            >
              <Icon name="close" size={20} color={colors.coralDark} />
              <Text style={styles.cancelText}>Foi engano ({segundosCancelamento} s)</Text>
            </TouchableOpacity>
          ) : isOffline || isTimeout ? null : (
            // Só garante "ajuda a caminho" quando o pedido realmente saiu: offline a família ainda não sabe.
            <View style={styles.helpBanner} testID="sos-ajuda-caminho">
              <Icon name="health_and_safety" size={22} color={colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.helpTitle}>Ajuda a caminho</Text>
                <Text style={styles.helpSub}>Fique calmo(a), seus familiares já foram avisados.</Text>
              </View>
            </View>
          )}

          {/* Familiar que assumiu o resgate (RN-009) */}
          {socorrista && (
            <View style={styles.rescueCard} testID="sos-socorrista">
              <View style={styles.rescueHeader}>
                <Icon name="directions_car" size={24} color={colors.successDark} />
                <View style={styles.flex}>
                  <Text style={styles.rescueTitle}>{primeiroNome} está a caminho</Text>
                  <Text style={styles.rescueSub}>
                    Ele assumiu o chamado às {formatarHora(socorrista.assumiuEm)}
                  </Text>
                </View>
              </View>
              <Text style={styles.rescueBody}>
                Fique onde está, se puder. A localização é enviada só enquanto o chamado está aberto.
              </Text>
            </View>
          )}

          {/* Sem conexão */}
          {isTimeout && (
            <View style={styles.offlineBox}>
              <Icon name="warning" size={20} color={colors.coralDark} />
              <Text style={styles.offlineText}>Sem conexão após 60 segundos.</Text>
            </View>
          )}
          {isOffline && !isTimeout && (
            <View style={styles.retryBox}>
              <ActivityIndicator size="small" color={colors.amber.text} />
              <Text style={styles.retryText}>Tentando conectar pela internet...</Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Icon name="call" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Sem internet? O app tenta por 60 s e depois abre o discador com o seu contato de emergência.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.callButton, isTimeout && styles.callButtonUrgent]}
            onPress={handleLigarContato}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="sos-ligar"
          >
            <Icon name="call" size={22} color={colors.white} />
            <Text style={styles.callText}>Ligar para {contatoPadrao.nome}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.minimize} onPress={onClose} activeOpacity={0.7} accessibilityRole="button" testID="sos-minimizar">
            <Text style={styles.minimizeText}>Fechar e manter o chamado ativo</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.canvasBase },
  topBar: {
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topEyebrow: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.6, fontFamily: typography.fontFamily.heading },
  topTitle: { fontSize: 20, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.peachBg,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  sosHalo: { width: 168, height: 168, borderRadius: 84, backgroundColor: colors.peachBorder, alignItems: 'center', justifyContent: 'center' },
  sosButton: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.coralDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.tier3,
  },
  sosButtonTimeout: { backgroundColor: colors.errorBright },
  sosButtonText: { fontSize: 32, fontWeight: '800', color: colors.white, fontFamily: typography.fontFamily.heading },
  sosButtonSub: { fontSize: 14, fontWeight: '600', color: colors.white, fontFamily: typography.fontFamily.body },
  heroTitle: { marginTop: 8, fontSize: 28, fontWeight: '800', color: colors.coralDark, textAlign: 'center', fontFamily: typography.fontFamily.heading },
  heroSub: { fontSize: 18, lineHeight: 26, fontWeight: '600', color: colors.onSurface, textAlign: 'center', fontFamily: typography.fontFamily.body },
  cancelButton: {
    minHeight: 64,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.peachBorder,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelText: { fontSize: 20, fontWeight: '800', color: colors.coralDark, fontFamily: typography.fontFamily.heading },
  helpBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 20, backgroundColor: colors.skyBg },
  helpTitle: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  helpSub: { fontSize: 14, lineHeight: 20, color: colors.primary, fontFamily: typography.fontFamily.body },
  rescueCard: { padding: 20, borderRadius: 24, backgroundColor: colors.mintBg, gap: 12 },
  rescueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rescueTitle: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  rescueSub: { fontSize: 14, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  rescueBody: { fontSize: 16, lineHeight: 24, color: colors.onSurface, fontFamily: typography.fontFamily.body },
  offlineBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.peachBg },
  offlineText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.coralDark, fontFamily: typography.fontFamily.body },
  retryBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.amberBg },
  retryText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.amber.textDark, fontFamily: typography.fontFamily.body },
  infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.skyBg },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.primary, fontFamily: typography.fontFamily.body },
  callButton: {
    minHeight: 64,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  callButtonUrgent: { backgroundColor: colors.coralDark },
  callText: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  minimize: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  minimizeText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, fontFamily: typography.fontFamily.body },
});
