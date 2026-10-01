import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Check,
  Sun,
  Moon,
  Clock,
  Pill,
  Droplet,
  Droplets,
  Syringe,
  Edit3,
  Play,
  Pause,
} from 'lucide-react-native';

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

  // Renderiza o marcador lateral da linha do tempo com Lucide Icons
  const renderTimelineMarker = () => {
    let circleBg = item.corIcone || '#0284C7';

    const renderMarkerIcon = () => {
      if (isTomado) {
        return <Check size={13} color="#FFFFFF" strokeWidth={3} />;
      }
      if (item.iconeTipo === 'sun') {
        return <Sun size={13} color="#EAB308" />;
      }
      if (item.iconeTipo === 'moon') {
        return <Moon size={13} color="#6366F1" />;
      }
      return <Clock size={13} color="#0284C7" />;
    };

    return (
      <View style={styles.timelineCol}>
        <View
          style={[
            styles.timelineCircle,
            isTomado ? styles.timelineCircleTaken : styles.timelineCirclePending,
            !isTomado && { borderColor: circleBg },
          ]}
        >
          {renderMarkerIcon()}
        </View>

        <Text style={styles.timelineTimeText}>{item.horario}</Text>

        {!isLast && <View style={styles.timelineLine} />}
      </View>
    );
  };

  const renderMedicineIcon = () => {
    const fmt = item.tipoFormato || '';
    if (fmt === 'gotas') return <Droplet size={18} color="#0284C7" />;
    if (fmt === 'xarope') return <Droplets size={18} color="#D97706" />;
    if (fmt === 'injecao') return <Syringe size={18} color="#DC2626" />;
    return <Pill size={18} color="#031753" />;
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
            {renderMedicineIcon()}
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
                {isTomado && <Check size={11} color="#10B981" strokeWidth={3} />}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Linha inferior de Status ou Botões de Ação */}
        {isTomado ? (
          <View style={styles.takenBanner}>
            <View style={styles.takenLeft}>
              <Check size={14} color="#16A34A" strokeWidth={3} style={{ marginRight: 6 }} />
              <Text style={styles.takenText}>Tomado com sucesso</Text>
            </View>
            <Text style={styles.takenTime}>
              às {item.horarioIngestaoHoje || '08:05'}
            </Text>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            {/* Se for o próximo medicamento a ser tomado */}
            {item.isProximo && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => onConfirm && onConfirm(item)}
                activeOpacity={0.8}
                disabled={loadingAction}
              >
                <Check size={13} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 4 }} />
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onEdit && onEdit(item)}
              activeOpacity={0.8}
            >
              <Edit3 size={13} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onTogglePause && onTogglePause(item)}
              activeOpacity={0.8}
            >
              {isPausado ? (
                <>
                  <Play size={12} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.actionBtnText}>Retomar</Text>
                </>
              ) : (
                <>
                  <Pause size={12} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.actionBtnText}>Pausar</Text>
                </>
              )}
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
    alignItems: 'stretch',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  timelineCol: {
    width: 50,
    alignItems: 'center',
    position: 'relative',
    marginRight: 10,
  },
  timelineCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
  },
  timelineCirclePending: {
    borderWidth: 2,
  },
  timelineCircleTaken: {
    backgroundColor: '#10B981',
  },
  timelineTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    top: 32,
    bottom: -16,
    width: 2,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardPaused: {
    backgroundColor: '#F8FAFC',
    opacity: 0.75,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#031753',
    flexShrink: 1,
  },
  nextBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  nextBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  pausedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  pausedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  medDosage: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  medInstructions: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchKnobRight: {
    alignSelf: 'flex-end',
  },
  switchKnobLeft: {
    alignSelf: 'flex-start',
  },
  takenBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  takenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  takenText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  takenTime: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
});
