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
} from '../components/DayOfWeekSelector';
import TolerancePicker from '../components/TolerancePicker';
import MedicineTimelineCard from '../components/MedicineTimelineCard';
import AddMedicineModal from '../components/AddMedicineModal';
import Icon from '../components/Icon';
import { typography } from '../theme';
import {
  listarRotinas,
  confirmarIngestao,
  criarRotina,
  atualizarRotina,
  removerRotina,
  INITIAL_MEDICINES,
} from '../services/medicamentoService.js';

const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function MedicinesScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
}) {
  const [rotinas, setRotinas] = useState(INITIAL_MEDICINES);
  const [selectedDayObj, setSelectedDayObj] = useState(
    DIAS_DA_SEMANA_PADRAO[3]
  ); // Quinta-feira, 24 Out
  const [toleranceMinutes, setToleranceMinutes] = useState(15);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const data = await listarRotinas(idosoId, selectedDayObj?.id);
        if (data && Array.isArray(data)) {
          setRotinas(data);
        }
      } catch (err) {
        console.warn('Erro ao listar rotinas:', err.message);
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [idosoId, selectedDayObj]);

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

  const handleConfirmDose = async (rotina) => {
    try {
      setActionLoadingId(rotina.id);
      const isTomado = rotina.statusHoje === 'TOMADO';
      const novoStatus = isTomado ? 'PENDENTE' : 'TOMADO';
      const obs = isTomado
        ? 'Dose desmarcada pelo familiar.'
        : 'Familiar confirmou dose no app.';

      const res = await confirmarIngestao(idosoId, rotina.id, {
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
    } catch (err) {
      Alert.alert('Erro', err.message || 'Falha ao alterar status da dose.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTogglePause = async (rotina) => {
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
    setEditingRoutine(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (rotina) => {
    setEditingRoutine(rotina);
    setModalVisible(true);
  };

  const handleSaveRoutine = async (payload, routineId) => {
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
    } catch (err) {
      Alert.alert(
        'Erro ao Salvar',
        err.message || 'Falha ao processar operação.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRoutine = async (routineId) => {
    try {
      setActionLoadingId(routineId);
      await removerRotina(routineId);
      setRotinas((prev) => prev.filter((r) => r.id !== routineId));
      setModalVisible(false);
      Alert.alert('Sucesso', 'Medicamento removido da rotina.');
    } catch (err) {
      console.warn('Erro ao remover rotina:', err.message);
      Alert.alert('Erro', 'Não foi possível remover o medicamento.');
    } finally {
      setActionLoadingId(null);
      setEditingRoutine(null);
    }
  };

  const handleDeleteFromCard = (rotina) => {
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
              <Icon name="check_circle" size={14} color="#003B26" />
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
        <TolerancePicker
          selectedTolerance={toleranceMinutes}
          onSelectTolerance={(mins) => setToleranceMinutes(mins)}
        />

        {/* CABEÇALHO DA TIMELINE: Horários de Hoje + Botão "+ Novo Remédio" */}
        <View style={styles.timelineHeaderRow}>
          <Text style={styles.timelineSectionTitle}>Horários de Hoje</Text>
          <TouchableOpacity
            style={styles.newMedicinePillBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.85}
          >
            <Icon name="add" size={16} color="#FFFFFF" />
            <Text style={styles.newMedicinePillText}>Novo Remédio</Text>
          </TouchableOpacity>
        </View>

        {/* TIMELINE DE MEDICAMENTOS */}
        <View style={styles.timelineSection}>
          {loading ? (
            <ActivityIndicator
              color="#031753"
              size="large"
              style={{ marginVertical: 30 }}
            />
          ) : rotinasUnicas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={{ marginBottom: 10 }}>
                <Icon name="medication" size={36} color="#94A3B8" />
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
              />
            ))
          )}
        </View>
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
    backgroundColor: '#F7F9FC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 105,
  },
  dailyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  dailyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailySubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  dailyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#131E3D',
    marginTop: 2,
    fontFamily: typography.fontFamily.heading,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    gap: 6,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003B26',
    fontFamily: typography.fontFamily.heading,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatsLeft: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  progressStatsRight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    fontFamily: typography.fontFamily.heading,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#F2F4F7',
    borderRadius: 9999,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 9999,
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
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  newMedicinePillBtn: {
    height: 40,
    backgroundColor: '#D83729',
    paddingHorizontal: 16,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#D83729',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  newMedicinePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
  timelineSection: {
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131E3D',
    marginBottom: 4,
    fontFamily: typography.fontFamily.heading,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: typography.fontFamily.body,
  },
});