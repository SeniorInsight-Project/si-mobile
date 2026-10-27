import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { typography } from '../theme';

function getCardTheme(item) {
  const nome = (item.medicamentoNome || '').toLowerCase();
  if (nome.includes('losart')) {
    return {
      thumbBg: '#E8F8F0',
      iconColor: '#003B26',
      pillBg: '#E8F8F0',
      pillText: '#003B26',
      pillIcon: 'water_drop',
    };
  }
  if (nome.includes('vitam')) {
    return {
      thumbBg: '#EBF5FF',
      iconColor: '#2D418A',
      pillBg: '#EBF5FF',
      pillText: '#2D418A',
      pillIcon: 'sunny',
    };
  }
  if (nome.includes('metform')) {
    return {
      thumbBg: '#FFF1EC',
      iconColor: '#9A3412',
      pillBg: '#FFF1EC',
      pillText: '#9A3412',
      pillIcon: 'schedule',
    };
  }
  if (nome.includes('sinvast')) {
    return {
      thumbBg: '#F3EEFF',
      iconColor: '#5B21B6',
      pillBg: '#F3EEFF',
      pillText: '#5B21B6',
      pillIcon: 'dark_mode',
    };
  }
  return {
    thumbBg: item.corFundoThumb || '#EBF5FF',
    iconColor: '#031753',
    pillBg: '#EBF5FF',
    pillText: '#2D418A',
    pillIcon: 'water_drop',
  };
}

export default function MedicineTimelineCard({
  item,
  isLast = false,
  onConfirm,
  onEdit,
  onTogglePause,
  onDelete,
  loadingAction = false,
}) {
  const isTomado = item.statusHoje === 'TOMADO';
  const isPausado = item.ativo === false;
  const isProximo = item.isProximo && !isTomado;
  const theme = getCardTheme(item);

  const renderTimelineMarker = () => {
    const renderMarkerIcon = () => {
      if (isTomado) {
        return <Icon name="check" size={14} color="#FFFFFF" />;
      }
      if (isProximo) {
        return <Icon name="schedule" size={14} color="#FFFFFF" />;
      }
      if (item.iconeTipo === 'moon') {
        return <Icon name="dark_mode" size={14} color="#64748B" />;
      }
      return <Icon name="sunny" size={14} color="#64748B" />;
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
                    color={isTomado ? '#FFFFFF' : '#031753'}
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
            <Icon name="check_circle" size={14} color="#059669" />
            <Text style={styles.takenText}>
              {item.horarioIngestaoHoje
                ? `Tomado com sucesso às ${item.horarioIngestaoHoje}`
                : 'Tomado com sucesso hoje'}
            </Text>
          </View>
        )}

        {/* Botões de Ação */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => onEdit && onEdit(item)}
            activeOpacity={0.8}
          >
            <Icon name="edit" size={14} color="#131E3D" />
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pauseBtn, isPausado && styles.pauseBtnActive]}
            onPress={() => onTogglePause && onTogglePause(item)}
            activeOpacity={0.8}
            disabled={loadingAction}
          >
            <Icon
              name={isPausado ? 'play_arrow' : 'pause'}
              size={14}
              color={isPausado ? '#059669' : '#64748B'}
            />
            <Text
              style={[
                styles.pauseBtnText,
                isPausado && styles.pauseBtnTextActive,
              ]}
            >
              {isPausado ? 'Retomar' : 'Pausar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete && onDelete(item)}
            activeOpacity={0.8}
          >
            <Icon name="delete" size={14} color="#BA1A1A" />
            <Text style={styles.deleteBtnText}>Excluir</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: 'rgba(3, 23, 83, 0.14)',
    zIndex: 1,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineCircleTaken: {
    backgroundColor: '#10B981',
  },
  timelineCircleNext: {
    backgroundColor: '#F59E0B',
  },
  timelineCirclePending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  timelineTimeText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    fontFamily: typography.fontFamily.heading,
  },
  timeTextTaken: {
    color: '#059669',
  },
  timeTextNext: {
    color: '#D97706',
  },
  timeTextPending: {
    color: '#64748B',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardNext: {
    borderWidth: 2,
    borderColor: '#EBF5FF',
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
    borderRadius: 16,
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
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  nextBadge: {
    backgroundColor: '#FFEBE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  nextBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B51C13',
    fontFamily: typography.fontFamily.heading,
  },
  pausedBadge: {
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  pausedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  medDosage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 6,
  },
  instructionPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#10B981',
  },
  switchTrackInactive: {
    backgroundColor: '#E2E8F0',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F2F4F7',
    height: 30,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginTop: 12,
    gap: 6,
  },
  takenText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  editBtn: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  pauseBtn: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
  },
  pauseBtnActive: {
    backgroundColor: '#E8F8F0',
  },
  pauseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: typography.fontFamily.heading,
  },
  pauseBtnTextActive: {
    color: '#059669',
  },
  deleteBtn: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BA1A1A',
    fontFamily: typography.fontFamily.heading,
  },
});
