import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar, { useEspacoBarraInferior } from '../components/BottomNavBar';
import DayOfWeekSelector, { DiaSemanaItem } from '../components/DayOfWeekSelector';
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
import { calcularProgresso, diaDeHoje, gerarSemana, mensagemRitmo } from '../services/semanaRemedios';

/** Abaixo desta largura (pt), os cabeçalhos dos cards empilham em coluna. */
const LARGURA_ESTREITA = 360;

export interface MedicinesScreenProps {
  onNavigate?: (screen: string) => void;
  idosoId?: string | null;
}

export default function MedicinesScreen({
  onNavigate,
  idosoId: idosoIdProp,
}: MedicinesScreenProps) {
  const espacoInferior = useEspacoBarraInferior();
  // O idoso vem do contexto; a prop `idosoId` serve só de override (testes).
  const { idosoId: idosoIdContexto } = useIdoso();
  const idosoId = idosoIdProp ?? idosoIdContexto;
  const somenteConfirmar = usePapel() === 'IDOSO';
  const [rotinas, setRotinas] = useState<RotinaMedicamento[]>([]);
  const semana = useMemo(() => gerarSemana(new Date()), []);
  const [selectedDayObj, setSelectedDayObj] = useState<DiaSemanaItem>(() => diaDeHoje(semana));
  const { width } = useWindowDimensions();
  const estreito = width < LARGURA_ESTREITA;
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingRoutine, setEditingRoutine] = useState<RotinaMedicamento | null>(null);

  const dataSelecionada = selectedDayObj.id;

  useEffect(() => {
    const idAtivo = idosoId;
    if (!idAtivo) {
      setRotinas([]);
      setLoading(false);
      return;
    }

    // Troca rápida de dia: só a resposta da última consulta entra na tela.
    let ativo = true;
    async function carregar(id: string, data: string) {
      try {
        setLoading(true);
        const resposta = await listarRotinas(id, { data });
        if (ativo && Array.isArray(resposta)) {
          setRotinas(resposta);
        }
      } catch (err: any) {
        if (!ativo) return;
        console.warn('Erro ao listar rotinas:', err?.message);
        Alert.alert('Erro', err?.message || 'Não foi possível carregar os medicamentos agora.');
      } finally {
        if (ativo) setLoading(false);
      }
    }

    carregar(idAtivo, dataSelecionada);
    return () => {
      ativo = false;
    };
  }, [idosoId, dataSelecionada]);

  const rotinasUnicas = useMemo(() => {
    const map = new Map();
    rotinas.forEach((r) => {
      if (r && r.id) map.set(r.id, r);
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.horario || '').localeCompare(b.horario || '')
    );
  }, [rotinas]);

  const progresso = useMemo(() => {
    const ativos = rotinasUnicas.filter((r) => r.ativo !== false);
    return calcularProgresso(ativos.filter((r) => r.statusHoje === 'TOMADO').length, ativos.length);
  }, [rotinasUnicas]);
  const ritmo = mensagemRitmo(progresso);
  const corRitmo =
    ritmo?.tom === 'sucesso' ? colors.successDark : ritmo?.tom === 'atencao' ? colors.amber.text : colors.textSecondary;
  const ehHoje = selectedDayObj.ehHoje;

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
        title="Remédios"
        onNavigate={onNavigate}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: espacoInferior }]}
        showsVerticalScrollIndicator={false}
      >
        {!idosoId ? (
          <SemIdosoCard onNavigate={onNavigate} />
        ) : (
          <>
            {/* CARD 1: ACOMPANHAMENTO DIÁRIO & CALENDÁRIO (rx=32, #FFFFFF) */}
        <View style={styles.dailyCard}>
          <View style={[styles.dailyHeaderRow, estreito && styles.headerColuna]}>
            <View style={styles.headerTextos}>
              <Text style={styles.dailySubtitle} numberOfLines={1}>
                {ehHoje ? 'Acompanhamento de hoje' : 'Acompanhamento Diário'}
              </Text>
              <Text style={styles.dailyTitle} numberOfLines={2}>
                {selectedDayObj.labelCompleta}
              </Text>
            </View>

            <View
              style={styles.progressBadge}
              accessible
              accessibilityLabel={`${progresso.percentual}% concluído`}
            >
              <Icon name="check_circle" size={14} color={colors.mint.textDark} />
              <Text style={styles.progressBadgeText} numberOfLines={1}>
                {progresso.percentual}% Concluído
              </Text>
            </View>
          </View>

          {/* Linha de texto acima da barra de progresso */}
          <View style={styles.progressStatsRow}>
            <Text style={styles.progressStatsLeft}>
              {progresso.total === 0
                ? ehHoje
                  ? 'Nenhum medicamento para hoje'
                  : 'Nenhum medicamento neste dia'
                : `${progresso.tomados} de ${progresso.total} medicamentos tomados ${ehHoje ? 'hoje' : 'neste dia'}`}
            </Text>
            {ritmo && (
              <Text style={[styles.progressStatsRight, { color: corRitmo }]} numberOfLines={1}>
                {ritmo.texto}
              </Text>
            )}
          </View>

          {/* Barra de Progresso Verde: largura real, sem mínimo */}
          <View
            style={styles.progressBarTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progresso.percentual }}
          >
            <View style={[styles.progressBarFill, { width: `${progresso.percentual}%` }]} />
          </View>

          {/* Carrossel de Dias da Semana (SEG a DOM) */}
          <DayOfWeekSelector
            dias={semana}
            selectedDate={selectedDayObj.id}
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
        <View style={[styles.timelineHeaderRow, estreito && styles.headerColuna]}>
          <Text style={[styles.timelineSectionTitle, styles.headerTextos]} numberOfLines={2}>
            {ehHoje ? 'Horários de Hoje' : `Horários de ${selectedDayObj.nomeDia}`}
          </Text>
          {!somenteConfirmar && (
            <Button
              title="Novo Remédio"
              variant="primary"
              size="md"
              iconLeft="add"
              fullWidth={estreito}
              onPress={handleOpenAddModal}
              style={estreito ? undefined : styles.botaoNovo}
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
                {somenteConfirmar
                  ? 'Sua família ainda não cadastrou remédios para este dia.'
                  : 'Toque em "Novo Remédio" para adicionar a primeira medicação da rotina.'}
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
  },
  dailyCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 20,
    marginBottom: 18,
    ...shadows.tier2,
  },
  dailyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerColuna: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 10,
  },
  headerTextos: {
    flexShrink: 1,
    minWidth: 0,
  },
  botaoNovo: {
    flexShrink: 0,
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
    flexShrink: 0,
  },
  progressBadgeText: {
    fontSize: 14,
    color: colors.mint.textDark,
    ...font('heading', 700),
  },
  progressStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 2,
    marginBottom: 6,
  },
  progressStatsLeft: {
    flexShrink: 1,
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
    gap: 12,
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
