import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import IconButton from './IconButton';
import { colors, font, rounded, shadows } from '../theme';
import { RotinaMedicamento } from '../services/medicamentoService';

function getCardTheme(item: RotinaMedicamento) {
  const nome = (item.medicamentoNome || '').toLowerCase();
  if (nome.includes('losart')) {
    return {
      thumbBg: colors.mint.background,
      iconColor: colors.mint.textDark,
      pillBg: colors.mint.background,
      pillText: colors.mint.textDark,
      pillIcon: 'water_drop',
    };
  }
  if (nome.includes('vitam')) {
    return {
      thumbBg: colors.infoSurface,
      iconColor: colors.primaryNavy,
      pillBg: colors.infoSurface,
      pillText: colors.primaryNavy,
      pillIcon: 'sunny',
    };
  }
  if (nome.includes('metform')) {
    return {
      thumbBg: colors.peach.background,
      iconColor: colors.amber.textDark,
      pillBg: colors.peach.background,
      pillText: colors.amber.textDark,
      pillIcon: 'schedule',
    };
  }
  if (nome.includes('sinvast')) {
    return {
      thumbBg: colors.lavender.background,
      iconColor: colors.lavender.textDark,
      pillBg: colors.lavender.background,
      pillText: colors.lavender.textDark,
      pillIcon: 'dark_mode',
    };
  }
  return {
    thumbBg: item.corFundoThumb || colors.infoSurface,
    iconColor: colors.primary,
    pillBg: colors.infoSurface,
    pillText: colors.primaryNavy,
    pillIcon: 'water_drop',
  };
}

export interface MedicineTimelineCardProps {
  item: RotinaMedicamento;
  isLast?: boolean;
  onConfirm?: (item: RotinaMedicamento) => void;
  onEdit?: (item: RotinaMedicamento) => void;
  onTogglePause?: (item: RotinaMedicamento) => void;
  onDelete?: (item: RotinaMedicamento) => void;
  loadingAction?: boolean;
  /** Visão do idoso: só confirma a dose; editar, pausar e excluir são do Familiar Administrador (RN-004). */
  somenteConfirmar?: boolean;
}

export default function MedicineTimelineCard({
  item,
  isLast = false,
  onConfirm,
  onEdit,
  onTogglePause,
  onDelete,
  somenteConfirmar = false,
  loadingAction = false,
}: MedicineTimelineCardProps) {
  const isTomado = item.statusHoje === 'TOMADO';
  const isPausado = item.ativo === false;
  const isProximo = item.isProximo && !isTomado;
  const theme = getCardTheme(item);

  const renderTimelineMarker = () => {
    const renderMarkerIcon = () => {
      if (isTomado) {
        return <Icon name="check" size={14} color={colors.white} />;
      }
      if (isProximo) {
        return <Icon name="schedule" size={14} color={colors.white} />;
      }
      if (item.iconeTipo === 'moon') {
        return <Icon name="dark_mode" size={14} color={colors.textSecondary} />;
      }
      return <Icon name="sunny" size={14} color={colors.textSecondary} />;
    };

    return (
      <View style={styles.timelineCol}>
        {!isLast && <View style={styles.timelineLine} />}

        <View
          style={[
            styles.timelineCircle,
            isTomado
              ? styles.timelineCircleTaken
              : isProximo
              ? styles.timelineCircleNext
              : styles.timelineCirclePending,
          ]}
        >
          {renderMarkerIcon()}
        </View>

        <Text
          style={[
            styles.timelineTimeText,
            isTomado
              ? styles.timeTextTaken
              : isProximo
              ? styles.timeTextNext
              : styles.timeTextPending,
          ]}
        >
          {item.horario}
        </Text>
      </View>
    );
  };

  const renderMedicineIcon = () => {
    const fmt = item.tipoFormato || '';
    if (fmt === 'gotas') {
      return <Icon name="water_drop" size={24} color={theme.iconColor} />;
    }
    if (fmt === 'xarope') {
      return <Icon name="droplets" size={24} color={theme.iconColor} />;
    }
    if (fmt === 'injecao') {
      return <Icon name="syringe" size={24} color={theme.iconColor} />;
    }
    return <Icon name="medication" size={24} color={theme.iconColor} />;
  };

  return (
    <View style={styles.rowWrapper}>
      {/* Coluna da Linha do Tempo à Esquerda */}
      {renderTimelineMarker()}

      {/* Card Branco da Medicação (rx=24) */}
      <View
        style={[
          styles.card,
          isProximo && styles.cardNext,
          isPausado && styles.cardPaused,
        ]}
      >
        <View style={styles.cardHeader}>
          {/* Miniatura pastel 56x56 */}
          <View
            style={[
              styles.thumbnailContainer,
              { backgroundColor: theme.thumbBg },
            ]}
          >
            {renderMedicineIcon()}
          </View>

          {/* Dados descritivos */}
          <View style={styles.infoContainer}>
            <View style={styles.topTitleSwitchRow}>
              <View style={styles.titleAndBadgeCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.medName} numberOfLines={1}>
                    {item.medicamentoNome || item.nomeMedicamento || 'Medicamento'}
                  </Text>
                  {isProximo && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>Próximo</Text>
                    </View>
                  )}
                  {isPausado && (
                    <View style={styles.pausedBadge}>
                      <Text style={styles.pausedBadgeText}>Pausado</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.medDosage} numberOfLines={1}>
                  {item.dosagem}
                </Text>
              </View>

              {/* Toggle Switch Neumórfico (48x28) */}
              <TouchableOpacity
                style={[
                  styles.switchTrack,
                  isTomado
                    ? styles.switchTrackActive
                    : styles.switchTrackInactive,
                ]}
                onPress={() => onConfirm && onConfirm(item)}
                activeOpacity={0.8}
                disabled={loadingAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="switch"
                accessibilityState={{ checked: isTomado }}
                accessibilityLabel={
                  isTomado
                    ? `Dose de ${item.medicamentoNome || item.nomeMedicamento || 'medicamento'} tomada. Toque para desmarcar.`
                    : `Marcar dose de ${item.medicamentoNome || item.nomeMedicamento || 'medicamento'} como tomada.`
                }
              >
                {loadingAction ? (
                  <ActivityIndicator
                    size="small"
                    color={isTomado ? colors.white : colors.primary}
                  />
                ) : (
                  <View
                    style={[
                      styles.switchKnob,
                      isTomado ? styles.switchKnobRight : styles.switchKnobLeft,
                    ]}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Pílula colorida de instrução */}
            <View
              style={[
                styles.instructionPill,
                { backgroundColor: theme.pillBg },
              ]}
            >
              <Icon name={theme.pillIcon} size={13} color={theme.pillText} />
              <Text
                style={[styles.instructionPillText, { color: theme.pillText }]}
                numberOfLines={1}
              >
                {item.instrucoes}
              </Text>
            </View>
          </View>
        </View>

        {/* Barra inferior de Status Tomado (#F2F4F7) */}
        {isTomado && (
          <View style={styles.takenBanner}>
            <Icon name="check_circle" size={14} color={colors.successDark} />
            <Text style={styles.takenText}>
              {item.horarioIngestaoHoje
                ? `Tomado com sucesso às ${item.horarioIngestaoHoje}`
                : 'Tomado com sucesso hoje'}
            </Text>
          </View>
        )}

        {/* Botões de Ação */}
        {!somenteConfirmar && (
        <View style={styles.actionsRow}>
          <IconButton
            icon="edit"
            variant="neutral"
            accessibilityLabel={`Editar ${item.nomeMedicamento || item.medicamentoNome || 'medicamento'}`}
            onPress={() => onEdit && onEdit(item)}
          />

          <IconButton
            icon={isPausado ? 'play_arrow' : 'pause'}
            variant="neutral"
            accessibilityLabel={isPausado ? 'Retomar medicamento' : 'Pausar medicamento'}
            onPress={() => onTogglePause && onTogglePause(item)}
            disabled={loadingAction}
            style={isPausado ? { backgroundColor: colors.mint.background } : undefined}
          />

          <IconButton
            icon="delete"
            variant="danger"
            accessibilityLabel={`Excluir ${item.nomeMedicamento || item.medicamentoNome || 'medicamento'}`}
            onPress={() => onDelete && onDelete(item)}
          />
        </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  timelineCol: {
    width: 48,
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: 32,
    bottom: -24,
    width: 2,
    backgroundColor: colors.border,
    zIndex: 1,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineCircleTaken: {
    backgroundColor: colors.success,
  },
  timelineCircleNext: {
    backgroundColor: colors.warning,
  },
  timelineCirclePending: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
  },
  timelineTimeText: {
    fontSize: 14,
    marginTop: 4,
    ...font('heading', 700),
  },
  timeTextTaken: {
    color: colors.successDark,
  },
  timeTextNext: {
    color: colors.amber.text,
  },
  timeTextPending: {
    color: colors.textSecondary,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 16,
    ...shadows.tier2,
  },
  cardNext: {
    borderWidth: 2,
    borderColor: colors.infoSurface,
  },
  cardPaused: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: rounded.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  topTitleSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleAndBadgeCol: {
    flex: 1,
    paddingRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  medName: {
    fontSize: 16,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  nextBadge: {
    backgroundColor: colors.peach.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
  },
  nextBadgeText: {
    fontSize: 14,
    color: colors.coralDark,
    ...font('heading', 700),
  },
  pausedBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
  },
  pausedBadgeText: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.textSecondary,
  },
  medDosage: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    gap: 6,
  },
  instructionPillText: {
    fontSize: 14,
    ...font('heading', 700),
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: rounded.input,
    padding: 4,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: colors.success,
  },
  switchTrackInactive: {
    backgroundColor: colors.border,
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: rounded.input,
    backgroundColor: colors.white,
  },
  switchKnobLeft: {
    alignSelf: 'flex-start',
  },
  switchKnobRight: {
    alignSelf: 'flex-end',
  },
  takenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    height: 30,
    borderRadius: rounded.input,
    paddingHorizontal: 10,
    marginTop: 12,
    gap: 6,
  },
  takenText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  editBtn: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.input,
  },
  editBtnText: {
    fontSize: 14,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  pauseBtn: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.input,
  },
  pauseBtnActive: {
    backgroundColor: colors.mint.background,
  },
  pauseBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('heading', 700),
  },
  pauseBtnTextActive: {
    color: colors.successDark,
  },
  deleteBtn: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.peach.background,
    borderRadius: rounded.input,
  },
  deleteBtnText: {
    fontSize: 14,
    color: colors.error,
    ...font('heading', 700),
  },
});
