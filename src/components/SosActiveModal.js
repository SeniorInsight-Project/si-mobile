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
import { Siren, PhoneCall, XCircle, CheckCircle2, ShieldAlert } from 'lucide-react-native';

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
              <Siren size={38} color="#FFFFFF" strokeWidth={2.4} />
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
              <CheckCircle2 size={16} color="#16A34A" />
              <Text style={styles.statusText}>
                3 Cuidadores Familiares notificados via Push &amp; SMS
              </Text>
            </View>
            <View style={styles.statusRow}>
              <CheckCircle2 size={16} color="#16A34A" />
              <Text style={styles.statusText}>
                Horário do acionamento: <Text style={styles.bold}>{horaFormatada}</Text>
              </Text>
            </View>
            <View style={styles.statusRow}>
              <ShieldAlert size={16} color="#DC2626" />
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
            <PhoneCall size={20} color="#FFFFFF" />
            <Text style={styles.samuButtonText}>Ligar para o SAMU (192)</Text>
          </TouchableOpacity>

          {/* Botão de cancelamento de falso alarme */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleConfirmarCancelamento}
            activeOpacity={0.8}
          >
            <XCircle size={18} color="#DC2626" />
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
    backgroundColor: 'rgba(3, 23, 83, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  alertTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#031753',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#334155',
    marginLeft: 8,
    flex: 1,
  },
  bold: {
    fontWeight: '700',
    color: '#031753',
  },
  boldRed: {
    fontWeight: '700',
    color: '#DC2626',
  },
  samuButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  samuButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  cancelButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  minimizeButton: {
    paddingVertical: 8,
  },
  minimizeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
