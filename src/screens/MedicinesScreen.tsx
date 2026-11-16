import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import DayOfWeekSelector, {
  DIAS_DA_SEMANA_PADRAO,
  DiaSemanaItem,
} from '../components/DayOfWeekSelector';
import TolerancePicker from '../components/TolerancePicker';
import MedicineTimelineCard from '../components/MedicineTimelineCard';
import AddMedicineModal from '../components/AddMedicineModal';
import Icon from '../components/Icon';
import SemIdosoCard from '../components/SemIdosoCard';
import Button from '../components/Button';
import { colors, font, rounded, shadows, typography } from '../theme';
import { usePapel } from '../context/PapelContext';
import {
  listarRotinas,
  confirmarIngestao,
  criarRotina,
  atualizarRotina,
  removerRotina,
  RotinaMedicamento,
  RotinaMedicamentoInput,
} from '../services/medicamentoService';
import { useIdoso } from '../context/IdosoContext';

export interface MedicinesScreenProps {
  onNavigate?: (screen: string) => void;
  idosoId?: string | null;
}

export default function MedicinesScreen({
  onNavigate,
  idosoId: idosoIdProp,
}: MedicinesScreenProps) {
  // O idoso vem do contexto; a prop `idosoId` serve só de override (testes).
  const { idosoId: idosoIdContexto } = useIdoso();
  const idosoId = idosoIdProp ?? idosoIdContexto;
  const somenteConfirmar = usePapel() === 'IDOSO';
  const [rotinas, setRotinas] = useState<RotinaMedicamento[]>([]);
  const [selectedDayObj, setSelectedDayObj] = useState<DiaSemanaItem>(
    DIAS_DA_SEMANA_PADRAO[3]
  ); // Quinta-feira, 24 Out
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingRoutine, setEditingRoutine] = useState<RotinaMedicamento | null>(null);

  useEffect(() => {
    const idAtivo = idosoId;
    if (!idAtivo) {
      setRotinas([]);
      setLoading(false);
      return;
    }

    async function carregar(id: string) {
      try {
        setLoading(true);
        const data = await listarRotinas(id);
        if (data && Array.isArray(data)) {
          setRotinas(data);
        }
      } catch (err: any) {
        console.warn('Erro ao listar rotinas:', err?.message);
        Alert.alert('Erro', err?.message || 'Não foi possível carregar os medicamentos agora.');
      } finally {
        setLoading(false);
      }
    }

    carregar(idAtivo);
  }, [idosoId]);

  const rotinasUnicas = useMemo(() => {
    const map = new Map();
    rotinas.forEach((r) => {
      if (r && r.id) map.set(r.id, r);
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.horario || '').localeCompare(b.horario || '')
    );
  }, [rotinas]);

  const { tomadosCount, totalCount, percentualConcluido } = useMemo(() => {
    if (!rotinasUnicas || rotinasUnicas.length === 0) {
      return { tomadosCount: 0, totalCount: 0, percentualConcluido: 0 };
    }
    const ativos = rotinasUnicas.filter((r) => r.ativo !== false);
    const tomados = ativos.filter((r) => r.statusHoje === 'TOMADO').length;
    const total = ativos.length;
    const pct = total > 0 ? Math.round((tomados / total) * 100) : 0;
    return {
      tomadosCount: tomados,
      totalCount: total,
      percentualConcluido: pct,
    };
  }, [rotinasUnicas]);

  const handleConfirmDose = async (rotina: RotinaMedicamento) => {
    if (!idosoId) return;
    const idAtivo = idosoId;
    try {
      setActionLoadingId(rotina.id);
      const isTomado = rotina.statusHoje === 'TOMADO';
      const novoStatus = isTomado ? 'PENDENTE' : 'TOMADO';
      const obs = isTomado
        ? 'Dose desmarcada pelo familiar.'
        : 'Familiar confirmou dose no app.';

      const res = await confirmarIngestao(idAtivo, rotina.id, {
        status: novoStatus,
        observacao: obs,
      });

      if (res && (res.sucesso || res.status === novoStatus)) {
        setRotinas((prev) =>
          prev.map((item) =>
            item.id === rotina.id
              ? {
                  ...item,
                  statusHoje: novoStatus,
                  horarioIngestaoHoje:
                    novoStatus === 'TOMADO'
                      ? res.horarioIngestaoHoje ||
                        new Date().toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : null,
                }
              : item
          )
        );
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao alterar status da dose.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTogglePause = async (rotina: RotinaMedicamento) => {
    try {
      setActionLoadingId(rotina.id);
      const novoStatusAtivo = !rotina.ativo;
      await atualizarRotina(rotina.id, { ativo: novoStatusAtivo });
      setRotinas((prev) =>
        prev.map((item) =>
          item.id === rotina.id ? { ...item, ativo: novoStatusAtivo } : item
        )
      );
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível alterar o status do medicamento.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenAddModal = () => {
    if (somenteConfirmar) return; // RN-004: só o Familiar Administrador cadastra
    setEditingRoutine(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (rotina: RotinaMedicamento) => {
    if (somenteConfirmar) return;
    setEditingRoutine(rotina);
    setModalVisible(true);
  };

  const handleSaveRoutine = async (
    payload: RotinaMedicamentoInput,
    routineId?: string
  ) => {
    if (!idosoId) {
      Alert.alert('Atenção', 'Selecione ou cadastre um idoso antes de adicionar medicamentos.');
      return;
    }
    try {
      setActionLoadingId('modal');
      if (routineId) {
        const atualizado = await atualizarRotina(routineId, payload);
        setRotinas((prev) =>
          prev.map((r) => (r.id === routineId ? { ...r, ...atualizado } : r))
        );
        Alert.alert('Sucesso', 'Medicamento atualizado com sucesso!');
      } else {
        const criado = await criarRotina(idosoId, payload);
        setRotinas((prev) => {
          const filtrados = prev.filter((r) => r.id !== criado.id);
          return [...filtrados, criado];
        });
        Alert.alert('Sucesso', 'Medicamento cadastrado na rotina!');
      }
      setModalVisible(false);
      setEditingRoutine(null);
    } catch (err: any) {
      Alert.alert(
        'Erro ao Salvar',
        err?.message || 'Falha ao processar operação.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    try {
      setActionLoadingId(routineId);
      await removerRotina(routineId);
      setRotinas((prev) => prev.filter((r) => r.id !== routineId));
      setModalVisible(false);
      Alert.alert('Sucesso', 'Medicamento removido da rotina.');
    } catch (err: any) {
      console.warn('Erro ao remover rotina:', err?.message);
      Alert.alert('Erro', 'Não foi possível remover o medicamento.');
    } finally {
      setActionLoadingId(null);
      setEditingRoutine(null);
    }
  };

  const handleDeleteFromCard = (rotina: RotinaMedicamento) => {
    const nome = rotina.medicamentoNome || rotina.nomeMedicamento || 'este medicamento';
    Alert.alert(
      'Excluir Medicamento',
      `Tem certeza que deseja remover ${nome} da rotina diária?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => handleDeleteRoutine(rotina.id),
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO */}
      <AppHeader
        title="Rotina De Remédios"
        subtitle="CUIDADO ATIVO"
        onNavigate={onNavigate}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!idosoId ? (
          <SemIdosoCard onNavigate={onNavigate} />
        ) : (
          <>
            {/* CARD 1: ACOMPANHAMENTO DIÁRIO & CALENDÁRIO (rx=32, #FFFFFF) */}
        <View style={styles.dailyCard}>
          <View style={styles.dailyHeaderRow}>
            <View>
              <Text style={styles.dailySubtitle}>Acompanhamento Diário</Text>
              <Text style={styles.dailyTitle}>
                {selectedDayObj?.labelCompleta || 'Quinta-feira, 24 Out'}
              </Text>
            </View>

            <View style={styles.progressBadge}>
              <Icon name="check_circle" size={14} color={colors.mint.textDark} />
              <Text style={styles.progressBadgeText}>
                {percentualConcluido}% Concluído
              </Text>
            </View>
          </View>

          {/* Linha de texto acima da barra de progresso */}
          <View style={styles.progressStatsRow}>
            <Text style={styles.progressStatsLeft}>
              {tomadosCount} de {totalCount} medicamentos tomados hoje
            </Text>
            <Text style={styles.progressStatsRight}>Ótimo ritmo</Text>
          </View>

          {/* Barra de Progresso Verde */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(percentualConcluido, 5)}%` },
              ]}
            />
          </View>

          {/* Carrossel de Dias da Semana (SEG a DOM) */}
          <DayOfWeekSelector
            selectedDate={selectedDayObj?.id}
            onSelectDate={(dia) => setSelectedDayObj(dia)}
          />
        </View>

        {/* CARD 2: JANELA DE TOLERÂNCIA */}
        {!somenteConfirmar && (
          <TolerancePicker
            selectedTolerance={toleranceMinutes}
            onSelectTolerance={(mins) => setToleranceMinutes(mins)}
          />
        )}

        {/* CABEÇALHO DA TIMELINE: Horários de Hoje + Botão "+ Novo Remédio" */}
        <View style={styles.timelineHeaderRow}>
          <Text style={styles.timelineSectionTitle}>Horários de Hoje</Text>
          {!somenteConfirmar && (
            <Button
              title="Novo Remédio"
              variant="primary"
              size="md"
              iconLeft="add"
              fullWidth={false}
              onPress={handleOpenAddModal}
            />
          )}
        </View>

        {/* TIMELINE DE MEDICAMENTOS */}
        <View style={styles.timelineSection}>
          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              size="large"
              style={{ marginVertical: 30 }}
            />
          ) : rotinasUnicas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={{ marginBottom: 10 }}>
                <Icon name="medication" size={36} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Nenhum medicamento agendado</Text>
              <Text style={styles.emptySubtitle}>
                Toque no botão acima para adicionar a primeira medicação da
                rotina.
              </Text>
            </View>
          ) : (
            rotinasUnicas.map((item, index) => (
              <MedicineTimelineCard
                key={item.id}
                item={item}
                isLast={index === rotinasUnicas.length - 1}
                onConfirm={handleConfirmDose}
                onEdit={handleOpenEditModal}
                onTogglePause={handleTogglePause}
                onDelete={handleDeleteFromCard}
                loadingAction={actionLoadingId === item.id}
                somenteConfirmar={somenteConfirmar}
              />
            ))
          )}
        </View>
          </>
        )}
      </ScrollView>

      {/* MODAL DE CADASTRO E EDIÇÃO DE MEDICAMENTOS */}
      <AddMedicineModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingRoutine(null);
        }}
        onSave={handleSaveRoutine}
        onDelete={handleDeleteRoutine}
        initialData={editingRoutine}
        loading={actionLoadingId === 'modal'}
      />

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <BottomNavBar currentScreen="Medicines" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 105,
  },
  dailyCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.full,
    padding: 20,
    marginBottom: 18,
    ...shadows.tier2,
  },
  dailyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  dailyTitle: {
    fontSize: 22,
    color: colors.textPrimary,
    marginTop: 2,
    ...font('heading', 700),
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.full,
    gap: 6,
  },
  progressBadgeText: {
    fontSize: 14,
    color: colors.mint.textDark,
    ...font('heading', 700),
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatsLeft: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 500),
  },
  progressStatsRight: {
    fontSize: 14,
    color: colors.successDark,
    ...font('heading', 700),
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.full,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: rounded.full,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  timelineSectionTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  timelineSection: {
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 4,
    ...font('heading', 700),
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    ...font('body', 400),
  },
});
