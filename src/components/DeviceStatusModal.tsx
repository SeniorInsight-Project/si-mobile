import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import ModalSheet from './ModalSheet';
import Button from './Button';
import { colors, rounded, shadows, font } from '../theme';
import {
  formatarHora,
  formatarResumoStatus,
  LIMITE_BATERIA_BAIXA,
  StatusDispositivo,
  ResultadoPerdaDados,
  SensorDispositivo,
} from '../services/deviceStatusService';

export interface DeviceStatusModalProps {
  visible: boolean;
  status: StatusDispositivo | null;
  /** Nome do idoso mostrado no cabeçalho; o status do contrato não traz nome. */
  nomeIdoso?: string;
  perdaDados?: ResultadoPerdaDados | null;
  onClose: () => void;
}

/**
 * Modal de Status do Celular do Idoso (HU-027 e HU-028).
 */
export default function DeviceStatusModal({
  visible,
  status,
  nomeIdoso,
  perdaDados,
  onClose,
}: DeviceStatusModalProps) {
  if (!status) return null;

  const horaSync = formatarHora(status.ultimaSincronizacao);
  const nivelBateria = typeof status.nivelBateria === 'number' ? status.nivelBateria : null;
  const bateriaBaixa = nivelBateria !== null && nivelBateria <= LIMITE_BATERIA_BAIXA;
  const infoAparelho = [status.modeloCelular, status.sistemaOperacional, status.versaoApp]
    .filter(Boolean)
    .join(' • ');
  const estaSemDados = Boolean(perdaDados && perdaDados.semDados);

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Status do Celular"
      subtitle={nomeIdoso}
      footer={
        <Button
          title="Entendi"
          onPress={onClose}
          variant="primary"
        />
      }
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
              {perdaDados?.mensagem || `Sem dados desde ${horaSync}. Verifique o celular do idoso.`}
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
        {infoAparelho ? <Text style={styles.deviceInfo}>{infoAparelho}</Text> : null}
      </View>

      {/* CARD 2: NÍVEL DA BATERIA */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconRow}>
            <Icon
              name={bateriaBaixa ? 'battery_alert' : 'battery_full'}
              size={20}
              color={bateriaBaixa ? colors.coral : colors.success}
            />
            <Text style={styles.sectionTitle}>Bateria do Aparelho</Text>
          </View>
          <Text
            style={[
              styles.batteryPercentage,
              { color: bateriaBaixa ? colors.coralDark : colors.primary },
            ]}
          >
            {nivelBateria ?? '--'}%
          </Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, nivelBateria ?? 0))}%`,
                backgroundColor: bateriaBaixa ? colors.coral : colors.success,
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
            {status.sensores.filter((s: SensorDispositivo) => s.ativo).length}/
            {status.sensores.length} ativos
          </Text>
        </View>

        <View style={styles.sensorList}>
          {status.sensores.map((sensor: SensorDispositivo) => {
            const desativado = !sensor.ativo;
            return (
              <View key={sensor.tipo} style={styles.sensorItem}>
                <View style={styles.sensorInfo}>
                  <Text style={styles.sensorName}>{sensor.nome}</Text>
                </View>

                <View
                  style={[
                    styles.sensorBadge,
                    desativado ? styles.sensorBadgeRevoked : styles.sensorBadgeActive,
                  ]}
                >
                  <Icon
                    name={desativado ? 'close' : 'check'}
                    size={14}
                    color={desativado ? colors.peach.text : colors.mint.text}
                  />
                  <Text
                    style={[
                      styles.sensorBadgeText,
                      { color: desativado ? colors.peach.text : colors.mint.text },
                    ]}
                  >
                    {desativado ? 'Desativado' : 'Ativo'}
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
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    color: colors.peach.text,
    ...font('heading', 700),
  },
  alertMessage: {
    fontSize: 14,
    color: colors.peach.textDark,
    ...font('body', 400),
    marginTop: 2,
    lineHeight: 20,
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
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.textSecondary,
    ...font('heading', 700),
  },
  canonicalSummary: {
    fontSize: 17,
    color: colors.primary,
    ...font('heading', 700),
    lineHeight: 24,
  },
  deviceInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 400),
    marginTop: 6,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.xl,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  batteryPercentage: {
    fontSize: 18,
    ...font('heading', 800),
  },
  progressBarTrack: {
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rounded.full,
  },
  batteryHint: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 400),
    lineHeight: 20,
  },
  sensorCount: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
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
    borderBottomColor: colors.surfaceSubtle,
  },
  sensorInfo: {
    flex: 1,
    paddingRight: 12,
  },
  sensorName: {
    fontSize: 14,
    color: colors.textPrimary,
    ...font('heading', 600),
  },
  sensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
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
    fontSize: 14,
    ...font('heading', 700),
  },
  helpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.input,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  helpText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 400),
    flex: 1,
    lineHeight: 20,
  },
});
