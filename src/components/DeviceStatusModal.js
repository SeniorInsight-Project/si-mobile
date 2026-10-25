import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from './Icon';
import { colors, typography, shadows, rounded } from '../theme';
import { formatarHora, formatarResumoStatus } from '../services/deviceStatusService.js';

/**
 * Modal de Status do Celular do Idoso (HU-027 e HU-028).
 * Apresenta:
 * - Última sincronização e nível de bateria
 * - Alerta de ausência de dados (quando atrasado)
 * - Lista de tipos de dados ativos e revogados pelo idoso (ex: oxigenação)
 */
export default function DeviceStatusModal({
  visible,
  status,
  perdaDados,
  onClose,
}) {
  if (!status) return null;

  const horaSync = formatarHora(status.ultimaSincronizacao);
  const nivelBateria = typeof status.nivelBateria === 'number' ? status.nivelBateria : 0;
  const bateriaBaixa = nivelBateria <= 20;
  const estaSemDados = perdaDados && perdaDados.semDados;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* HEADER DO MODAL */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.phoneIconCircle}>
                <Icon name="smartphone" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Status do Celular</Text>
                <Text style={styles.headerSubtitle}>{status.nomeIdoso || 'Idoso Monitorado'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Fechar status do celular"
              accessibilityRole="button"
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ALERTA DE PERDA DE DADOS (HU-028) */}
            {estaSemDados && (
              <View style={styles.alertBanner}>
                <View style={styles.alertIconCircle}>
                  <Icon name="warning" size={18} color={colors.peach.text} />
                </View>
                <View style={styles.alertTextWrapper}>
                  <Text style={styles.alertTitle}>Atenção à Conexão</Text>
                  <Text style={styles.alertMessage}>
                    {perdaDados.mensagem || `Sem dados desde ${horaSync}. Verifique o celular do idoso.`}
                  </Text>
                </View>
              </View>
            )}

            {/* CARD 1: RESUMO CANÔNICO DA HU-027 */}
            <View style={styles.canonicalCard}>
              <View style={styles.canonicalHeader}>
                <Icon name="sync" size={16} color={estaSemDados ? colors.warning : colors.success} />
                <Text style={styles.canonicalTag}>
                  {estaSemDados ? 'SINCRONIZAÇÃO PENDENTE' : 'MONITORAMENTO ATIVO'}
                </Text>
              </View>
              <Text style={styles.canonicalSummary}>
                {formatarResumoStatus(status)}
              </Text>
              <Text style={styles.deviceInfo}>
                {status.modeloCelular} • {status.versaoApp}
              </Text>
            </View>

            {/* CARD 2: NÍVEL DA BATERIA */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconRow}>
                  <Icon
                    name={bateriaBaixa ? 'battery_alert' : 'battery_full'}
                    size={20}
                    color={bateriaBaixa ? colors.secondaryCoral : colors.success}
                  />
                  <Text style={styles.sectionTitle}>Bateria do Aparelho</Text>
                </View>
                <Text
                  style={[
                    styles.batteryPercentage,
                    { color: bateriaBaixa ? colors.secondaryCoral : colors.primary },
                  ]}
                >
                  {nivelBateria}%
                </Text>
              </View>

              {/* BARRA DE BATERIA */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, nivelBateria))}%`,
                      backgroundColor: bateriaBaixa ? colors.secondaryCoral : colors.success,
                    },
                  ]}
                />
              </View>

              <Text style={styles.batteryHint}>
                {bateriaBaixa
                  ? 'Bateria baixa (≤ 20%). Lembre o idoso de colocar o celular no carregador.'
                  : 'Nível adequado de bateria para transmissão contínua de dados.'}
              </Text>
            </View>

            {/* CARD 3: TIPOS DE DADOS ATIVOS E REVOGADOS (HU-027) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconRow}>
                  <Icon name="tune" size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Sensores e Permissões</Text>
                </View>
                <Text style={styles.sensorCount}>
                  {(status.tiposDados || []).filter((t) => t.ativo).length}/
                  {(status.tiposDados || []).length} ativos
                </Text>
              </View>

              <View style={styles.sensorList}>
                {(status.tiposDados || []).map((tipo) => {
                  const isRevogado = tipo.revogadoPeloIdoso || !tipo.ativo;
                  return (
                    <View key={tipo.id} style={styles.sensorItem}>
                      <View style={styles.sensorInfo}>
                        <Text style={styles.sensorName}>{tipo.nome}</Text>
                        <Text
                          style={[
                            styles.sensorDetail,
                            isRevogado && { color: colors.peach.text },
                          ]}
                        >
                          {tipo.detalhe}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.sensorBadge,
                          isRevogado ? styles.sensorBadgeRevoked : styles.sensorBadgeActive,
                        ]}
                      >
                        <Icon
                          name={isRevogado ? 'close' : 'check'}
                          size={12}
                          color={isRevogado ? colors.peach.text : colors.mint.text}
                        />
                        <Text
                          style={[
                            styles.sensorBadgeText,
                            isRevogado
                              ? { color: colors.peach.text }
                              : { color: colors.mint.text },
                          ]}
                        >
                          {isRevogado ? 'Desativado' : 'Ativo'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* DICA INFORMATIVA */}
            <View style={styles.helpBox}>
              <Icon name="info" size={16} color={colors.textSecondary} />
              <Text style={styles.helpText}>
                O monitoramento depende do celular coletor ligado e conectado à internet para enviar os lotes da telemetria.
              </Text>
            </View>
          </ScrollView>

          {/* BOTÃO PRIMÁRIO DE FECHAR */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onClose}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 35, 105, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: rounded.card,
    borderTopRightRadius: rounded.card,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '88%',
    ...shadows.tier3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.heading,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: colors.peach.background,
    borderColor: colors.peach.border,
    borderWidth: 1.5,
    borderRadius: rounded.lg,
    padding: 14,
    marginBottom: 14,
    gap: 12,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.peach.text,
    fontFamily: typography.fontFamily.heading,
  },
  alertMessage: {
    fontSize: 12,
    color: colors.peach.textDark,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
    lineHeight: 18,
  },
  canonicalCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.xl,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  canonicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  canonicalTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.heading,
  },
  canonicalSummary: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
    lineHeight: 24,
  },
  deviceInfo: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.body,
    marginTop: 6,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.xl,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.tier1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.heading,
  },
  batteryPercentage: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.fontFamily.heading,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.slate100,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rounded.full,
  },
  batteryHint: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
    lineHeight: 18,
  },
  sensorCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  sensorList: {
    marginTop: 6,
    gap: 10,
  },
  sensorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate100,
  },
  sensorInfo: {
    flex: 1,
    paddingRight: 12,
  },
  sensorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.heading,
  },
  sensorDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
    marginTop: 2,
  },
  sensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  sensorBadgeActive: {
    backgroundColor: colors.mint.background,
    borderColor: colors.mint.border,
    borderWidth: 1,
  },
  sensorBadgeRevoked: {
    backgroundColor: colors.peach.background,
    borderColor: colors.peach.border,
    borderWidth: 1,
  },
  sensorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.md,
    padding: 12,
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
    flex: 1,
    lineHeight: 18,
  },
  actionButton: {
    height: 52,
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: rounded.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    ...shadows.tier2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: typography.fontFamily.heading,
  },
});
