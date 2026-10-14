import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
  Alert,
} from 'react-native';
import Icon from './Icon';
import { colors, typography, shadows, rounded } from '../theme';

export default function SosActiveModal({
  visible,
  alarme,
  onClose,
  onCancelAlarme,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => pulseLoop.stop();
    }
  }, [visible, pulseAnim]);

  const handleLigarSamu = () => {
    Linking.openURL('tel:192').catch(() => {
      Alert.alert('Discador Indisponível', 'Disque 192 manualmente pelo seu telefone.');
    });
  };

  const handleConfirmarCancelamento = () => {
    Alert.alert(
      'Cancelar Alarme SOS?',
      'Deseja registrar este acionamento como falso alarme e tranquilizar a rede de cuidadores?',
      [
        { text: 'Não, manter alerta', style: 'cancel' },
        {
          text: 'Sim, cancelar socorro',
          style: 'destructive',
          onPress: () => {
            if (onCancelAlarme && alarme?.id) {
              onCancelAlarme(alarme.id);
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  const horaFormatada = alarme?.criadoEm
    ? new Date(alarme.criadoEm).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Agora';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Ícone pulsante de sirene */}
          <Animated.View
            style={[
              styles.iconWrapper,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.iconCircle}>
              <Icon name="emergency" size={38} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Cabeçalho do Alarme */}
          <Text style={styles.alertTag}>SISTEMA DE EMERGÊNCIA ATIVADO</Text>
          <Text style={styles.title}>Socorro em Andamento!</Text>
          <Text style={styles.subtitle}>
            Sua localização exata e status de bateria ({alarme?.nivelBateria ?? 88}%) foram
            enviados em tempo real com alta prioridade (SLA &lt; 100ms).
          </Text>

          {/* Painel com cuidadores notificados */}
          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <Icon name="check_circle" size={16} color={colors.successDark} />
              <Text style={styles.statusText}>
                3 Cuidadores Familiares notificados via Push &amp; SMS
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Icon name="check_circle" size={16} color={colors.successDark} />
              <Text style={styles.statusText}>
                Horário do acionamento: <Text style={styles.bold}>{horaFormatada}</Text>
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Icon name="shield_alert" size={16} color={colors.secondaryCoral} />
              <Text style={styles.statusText}>
                Status do alarme: <Text style={styles.boldRed}>{alarme?.status || 'DISPARADO'}</Text>
              </Text>
            </View>
          </View>

          {/* Botão de discagem rápida SAMU 192 */}
          <TouchableOpacity
            style={styles.samuButton}
            onPress={handleLigarSamu}
            activeOpacity={0.85}
          >
            <Icon name="call" size={20} color="#FFFFFF" />
            <Text style={styles.samuButtonText}>Ligar para o SAMU (192)</Text>
          </TouchableOpacity>

          {/* Botão de cancelamento de falso alarme */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleConfirmarCancelamento}
            activeOpacity={0.8}
          >
            <Icon name="cancel" size={18} color={colors.secondaryCoral} />
            <Text style={styles.cancelButtonText}>Cancelar Alarme (Falso Alarme)</Text>
          </TouchableOpacity>

          {/* Botão de fechar/minimizar mantendo o alarme ativo */}
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.minimizeText}>Minimizar e Manter Monitoramento</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 35, 105, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 24,
    alignItems: 'center',
    ...shadows.tier3,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.secondaryCoral,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.tier2,
  },
  alertTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondaryCoral,
    letterSpacing: 0.8,
    marginBottom: 6,
    fontFamily: typography.fontFamily.heading,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    fontFamily: typography.fontFamily.body,
  },
  statusBox: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    color: colors.onSurface,
    marginLeft: 8,
    flex: 1,
    fontFamily: typography.fontFamily.body,
  },
  bold: {
    fontWeight: '700',
    color: colors.primary,
  },
  boldRed: {
    fontWeight: '800',
    color: colors.secondaryCoral,
  },
  samuButton: {
    width: '100%',
    minHeight: 48,
    backgroundColor: colors.secondary,
    borderRadius: rounded.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 12,
    ...shadows.tier2,
  },
  samuButtonText: {
    color: colors.onSecondary,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: typography.fontFamily.heading,
  },
  cancelButton: {
    width: '100%',
    minHeight: 48,
    backgroundColor: colors.peach.background,
    borderWidth: 1.5,
    borderColor: colors.peach.border,
    borderRadius: rounded.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 14,
  },
  cancelButtonText: {
    color: colors.secondaryCoral,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
    fontFamily: typography.fontFamily.heading,
  },
  minimizeButton: {
    paddingVertical: 8,
  },
  minimizeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: typography.fontFamily.body,
  },
});
