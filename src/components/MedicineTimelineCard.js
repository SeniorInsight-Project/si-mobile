import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

export default function MedicineTimelineCard({
  item,
  isLast = false,
  onConfirm,
  onEdit,
  onTogglePause,
  loadingAction = false,
}) {
  const isTomado = item.statusHoje === 'TOMADO';
  const isPausado = item.ativo === false;

  // Renderiza o marcador lateral da linha do tempo
  const renderTimelineMarker = () => {
    let circleBg = item.corIcone || '#0284C7';
    let circleContent = '⏰';

    if (isTomado) {
      circleBg = '#10B981';
      circleContent = '✓';
    } else if (item.iconeTipo === 'sun') {
      circleContent = '☀️';
    } else if (item.iconeTipo === 'moon') {
      circleContent = '🌙';
    } else {
      circleContent = '⏰';
    }

    return (
      <View style={styles.timelineCol}>
        <View
          style={[
            styles.timelineCircle,
            isTomado ? styles.timelineCircleTaken : styles.timelineCirclePending,
            !isTomado && { borderColor: circleBg },
          ]}
        >
          <Text
            style={[
              styles.timelineCircleText,
              isTomado && styles.timelineCircleTextWhite,
            ]}
          >
            {circleContent}
          </Text>
        </View>

        <Text style={styles.timelineTimeText}>{item.horario}</Text>

        {!isLast && <View style={styles.timelineLine} />}
      </View>
    );
  };

  return (
    <View style={styles.rowWrapper}>
      {/* Coluna da Linha do Tempo */}
      {renderTimelineMarker()}

      {/* Card da Medicação */}
      <View style={[styles.card, isPausado && styles.cardPaused]}>
        {/* Linha superior: Imagem / Ícone + Detalhes + Switch */}
        <View style={styles.cardHeader}>
          {/* Miniatura do medicamento */}
          <View
            style={[
              styles.thumbnailContainer,
              { backgroundColor: item.corFundoThumb || '#EBF3FE' },
            ]}
          >
            <Text style={styles.thumbEmoji}>{item.thumbEmoji || '💊'}</Text>
          </View>

          {/* Dados descritivos */}
          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.medName} numberOfLines={1}>
                {item.medicamentoNome}
              </Text>
              {item.isProximo && !isTomado && (
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
            <Text style={styles.medInstructions} numberOfLines={2}>
              {item.instrucoes}
            </Text>
          </View>

          {/* Switch de Ingestão */}
          <TouchableOpacity
            style={[
              styles.switchTrack,
              isTomado ? styles.switchTrackActive : styles.switchTrackInactive,
            ]}
            onPress={() => onConfirm && onConfirm(item)}
            activeOpacity={0.8}
            disabled={loadingAction}
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
              >
                {isTomado && <Text style={styles.switchCheckmark}>✓</Text>}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Linha inferior de Status ou Botões de Ação */}
        {isTomado ? (
          <View style={styles.takenBanner}>
            <View style={styles.takenLeft}>
              <Text style={styles.takenIcon}>✓</Text>
              <Text style={styles.takenText}>Tomado com sucesso</Text>
            </View>
            <Text style={styles.takenTime}>
              às {item.horarioIngestaoHoje || '08:05'}
            </Text>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            {/* Se for o próximo medicamento a ser tomado ou pendente com destaque */}
            {item.isProximo && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => onConfirm && onConfirm(item)}
                activeOpacity={0.8}
                disabled={loadingAction}
              >
                <Text style={styles.confirmBtnText}>✓ Confirmar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onEdit && onEdit(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>✎ Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onTogglePause && onTogglePause(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>
                {isPausado ? '▶ Retomar' : '⏸ Pausar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrapper: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 6,
  },
  timelineCol: {
    width: 48,
    alignItems: 'center',
    marginRight: 8,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0284C7',
    zIndex: 2,
  },
  timelineCircleTaken: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  timelineCirclePending: {
    backgroundColor: '#F0F9FF',
  },
  timelineCircleText: {
    fontSize: 13,
    color: '#031753',
    fontWeight: 'bold',
  },
  timelineCircleTextWhite: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  timelineTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
    marginTop: 4,
    marginBottom: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardPaused: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbEmoji: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  medName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#031753',
  },
  nextBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#BFDBFE',
  },
  nextBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  pausedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pausedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  medDosage: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  medInstructions: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
    marginLeft: 6,
  },
  switchTrackActive: {
    backgroundColor: '#031753',
  },
  switchTrackInactive: {
    backgroundColor: '#E2E8F0',
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  switchKnobRight: {
    alignSelf: 'flex-end',
  },
  switchKnobLeft: {
    alignSelf: 'flex-start',
  },
  switchCheckmark: {
    fontSize: 11,
    fontWeight: '900',
    color: '#031753',
  },
  takenBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: '#DCFCE7',
  },
  takenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  takenIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    marginRight: 6,
  },
  takenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  takenTime: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  confirmBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  actionBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
