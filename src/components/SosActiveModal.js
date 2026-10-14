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
} from 'react-native';
import Icon from './Icon';
import { colors, typography, shadows, rounded } from '../theme';

/**
 * Modal / Tela "Chamando sua família" (HU-063, HU-064 e RN-009).
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
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [segundosCancelamento, setSegundosCancelamento] = useState(10);
  const cancelTimerRef = useRef(null);

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
            clearInterval(cancelTimerRef.current);
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

  const horaFormatada = alarme?.criadoEm
    ? new Date(alarme.criadoEm).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isOffline = filaStatus?.status === 'PENDENTE_OFFLINE';
  const isTimeout = filaStatus?.status === 'EXPIRADO';
  const tempoRestante = filaStatus?.tempoRestanteSegundos ?? 60;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Ícone pulsante de sirene / emergência */}
          <Animated.View
            style={[
              styles.iconWrapper,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={[styles.iconCircle, isTimeout && styles.iconCircleTimeout]}>
              <Icon name="crisis_alert" size={40} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Cabeçalho da Tela: "Chamando sua família" (HU-063) */}
          <Text style={styles.alertTag}>EMERGÊNCIA ACIONADA</Text>
          <Text style={styles.title}>Chamando sua família</Text>
          <Text style={styles.subtitle}>
            Sua localização aproximada e pedido de socorro estão sendo enviados para sua rede de apoio.
          </Text>

          {/* Card de Status de Envio e Conexão */}
          <View style={styles.statusBox}>
            {isTimeout ? (
              <View style={styles.alertOfflineBox}>
                <Icon name="warning" size={20} color="#B51C13" />
                <View style={styles.alertOfflineTextWrapper}>
                  <Text style={styles.alertOfflineTitle}>Sem conexão após 60 segundos</Text>
                  <Text style={styles.alertOfflineSub}>
                    Não conseguimos enviar via internet. Ligue diretamente para o seu cuidador abaixo.
                  </Text>
                </View>
              </View>
            ) : isOffline ? (
              <View style={styles.alertWarningBox}>
                <ActivityIndicator size="small" color="#D97706" />
                <View style={styles.alertOfflineTextWrapper}>
                  <Text style={styles.alertWarningTitle}>Tentando conectar pela internet...</Text>
                  <Text style={styles.alertWarningSub}>
                    Reenviando automaticamente ({tempoRestante}s restantes)
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.statusRow}>
                <Icon name="check_circle" size={18} color="#16A34A" />
                <Text style={styles.statusText}>
                  Família notificada com alta prioridade
                </Text>
              </View>
            )}

            <View style={styles.statusRow}>
              <Icon name="schedule" size={16} color="#64748B" />
              <Text style={styles.statusText}>
                Horário do chamado: <Text style={styles.bold}>{horaFormatada}</Text>
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Icon name="person" size={16} color="#64748B" />
              <Text style={styles.statusText}>
                1º socorrista: <Text style={styles.bold}>{contatoPadrao.nome}</Text> ({contatoPadrao.parentesco || 'Familiar'})
              </Text>
            </View>
          </View>

          {/* Botão de Cancelamento em 10 segundos (HU-064 / RN-009) */}
          {segundosCancelamento > 0 ? (
            <TouchableOpacity
              style={styles.cancel10Button}
              onPress={handleFoiEngano}
              activeOpacity={0.8}
            >
              <Icon name="cancel" size={20} color="#FFFFFF" />
              <Text style={styles.cancel10ButtonText}>
                Foi engano (Cancelar em {segundosCancelamento}s)
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.ajudaCaminhoBanner}>
              <Icon name="health_and_safety" size={22} color="#031753" />
              <Text style={styles.ajudaCaminhoText}>Ajuda a caminho</Text>
              <Text style={styles.ajudaCaminhoSub}>
                Fique calmo(a), seus familiares já foram avisados!
              </Text>
            </View>
          )}

          {/* Botão para ligar para o 1º contato de emergência (Cenário 3 / Fallback) */}
          <TouchableOpacity
            style={[styles.callButton, isTimeout && styles.callButtonUrgent]}
            onPress={handleLigarContato}
            activeOpacity={0.85}
          >
            <Icon name="call" size={20} color="#FFFFFF" />
            <Text style={styles.callButtonText}>
              Ligar para {contatoPadrao.nome}
            </Text>
          </TouchableOpacity>

          {/* Minimizar modal mantendo o socorro ativo */}
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.minimizeText}>Fechar e Manter Chamado Ativo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 23, 83, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    ...shadows.tier3,
  },
  iconWrapper: {
    marginBottom: 14,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#B51C13',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.tier2,
    borderWidth: 4,
    borderColor: '#FEE2E2',
  },
  iconCircleTimeout: {
    backgroundColor: '#DC2626',
  },
  alertTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B51C13',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.headlineMedium,
    color: '#031753',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    fontSize: 24,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    ...typography.bodySmall,
    color: '#334155',
    flex: 1,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  alertOfflineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  alertOfflineTextWrapper: {
    flex: 1,
  },
  alertOfflineTitle: {
    ...typography.labelMedium,
    color: '#B51C13',
    fontWeight: '800',
  },
  alertOfflineSub: {
    ...typography.bodySmall,
    color: '#7F1D1D',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  alertWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertWarningTitle: {
    ...typography.labelMedium,
    color: '#B45309',
    fontWeight: '800',
  },
  alertWarningSub: {
    ...typography.bodySmall,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  cancel10Button: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#B51C13',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    ...shadows.tier2,
  },
  cancel10ButtonText: {
    ...typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  ajudaCaminhoBanner: {
    width: '100%',
    backgroundColor: '#EBF5FF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ajudaCaminhoText: {
    ...typography.titleMedium,
    color: '#031753',
    fontWeight: '900',
    fontSize: 18,
    marginTop: 2,
  },
  ajudaCaminhoSub: {
    ...typography.bodySmall,
    color: '#1E40AF',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  callButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#031753',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  callButtonUrgent: {
    backgroundColor: '#B51C13',
  },
  callButtonText: {
    ...typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  minimizeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  minimizeText: {
    ...typography.labelMedium,
    color: '#64748B',
    fontWeight: '600',
  },
});
