import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import BottomNavBar from '../components/BottomNavBar';
import DayOfWeekSelector, { DIAS_DA_SEMANA_PADRAO } from '../components/DayOfWeekSelector';
import TolerancePicker from '../components/TolerancePicker';
import MedicineTimelineCard from '../components/MedicineTimelineCard';
import AddMedicineModal from '../components/AddMedicineModal';
import {
  listarRotinas,
  confirmarIngestao,
  criarRotina,
  atualizarRotina,
  removerRotina,
  INITIAL_MEDICINES,
} from '../services/medicamentoService.js';

// ID padrão para desenvolvimento e testes
const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function MedicinesScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
}) {
  const [rotinas, setRotinas] = useState(INITIAL_MEDICINES);
  const [selectedDayObj, setSelectedDayObj] = useState(DIAS_DA_SEMANA_PADRAO[3]); // Quinta-feira, 24 Out
  const [toleranceMinutes, setToleranceMinutes] = useState(15); // 15 min conforme protótipo
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

  // Carrega as rotinas para a data selecionada
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
  }, [idosoId, selectedDayObj?.id]);

  // Cálculos dinâmicos de conclusão diária
  const { totalCount, tomadosCount, percentualConcluido } = useMemo(() => {
    const total = rotinas.length;
    const tomados = rotinas.filter((r) => r.statusHoje === 'TOMADO').length;
    const percent = total > 0 ? Math.round((tomados / total) * 100) : 0;
    return {
      totalCount: total,
      tomadosCount: tomados,
      percentualConcluido: percent,
    };
  }, [rotinas]);

  // Alterna confirmação de ingestão (Switch ou Botão Confirmar)
  const handleConfirmarIngestao = async (item) => {
    const isCurrentlyTaken = item.statusHoje === 'TOMADO';

    if (isCurrentlyTaken) {
      // Pergunta se deseja desmarcar
      Alert.alert(
        'Desmarcar Ingestão',
        `Deseja reverter a confirmação de ingestão de ${item.medicamentoNome}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Reverter',
            style: 'destructive',
            onPress: async () => {
              setRotinas((prev) =>
                prev.map((r) =>
                  r.id === item.id
                    ? {
                        ...r,
                        statusHoje: 'PENDENTE',
                        horarioIngestaoHoje: null,
                        iconeTipo: 'clock',
                        corIcone: '#0284C7',
                      }
                    : r
                )
              );
            },
          },
        ]
      );
      return;
    }

    // Confirma ingestão da medicação
    try {
      setActionLoadingId(item.id);
      const agora = new Date();
      const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Atualização otimista
      setRotinas((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? {
                ...r,
                statusHoje: 'TOMADO',
                horarioIngestaoHoje: horaStr,
                isProximo: false,
                iconeTipo: 'check',
                corIcone: '#10B981',
              }
            : r
        )
      );

      await confirmarIngestao(item.id, {
        dataHoraIngestao: agora.toISOString(),
        dataReferencia: selectedDayObj?.id,
        status: 'TOMADO',
        observacao: `Confirmado às ${horaStr}`,
      });
    } catch (err) {
      console.warn('Erro ao confirmar ingestão:', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Alterna status Ativo / Pausado
  const handleTogglePause = async (item) => {
    const novoStatusAtivo = !item.ativo;
    const acaoTexto = novoStatusAtivo ? 'reativado' : 'pausado';

    try {
      setActionLoadingId(item.id);

      // Atualização otimista
      setRotinas((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, ativo: novoStatusAtivo } : r))
      );

      await atualizarRotina(item.id, {
        ativo: novoStatusAtivo,
      });

      Alert.alert(
        novoStatusAtivo ? 'Lembrete Reativado' : 'Lembrete Pausado',
        `O medicamento ${item.medicamentoNome} foi ${acaoTexto} com sucesso.`
      );
    } catch (err) {
      console.warn('Erro ao alterar status da rotina:', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Abre modal para editar
  const handleEditRoutine = (item) => {
    setEditingRoutine(item);
    setModalVisible(true);
  };

  // Abre modal para cadastrar novo
  const handleOpenAddModal = () => {
    setEditingRoutine(null);
    setModalVisible(true);
  };

  // Salva (cria ou atualiza) a rotina
  const handleSaveRoutine = async (dados) => {
    try {
      setActionLoadingId('modal');
      setModalVisible(false);

      if (dados.id) {
        // Atualização
        const atualizado = await atualizarRotina(dados.id, dados);
        setRotinas((prev) =>
          prev.map((r) => (r.id === dados.id ? { ...r, ...atualizado } : r))
        );
      } else {
        // Criação de nova rotina
        const novo = await criarRotina(idosoId, dados);
        setRotinas((prev) => [...prev, novo].sort((a, b) => a.horario.localeCompare(b.horario)));
      }
    } catch (err) {
      console.warn('Erro ao salvar rotina:', err.message);
      Alert.alert('Erro', 'Não foi possível salvar a rotina de medicação.');
    } finally {
      setActionLoadingId(null);
      setEditingRoutine(null);
    }
  };

  // Exclui rotina existente
  const handleDeleteRoutine = async (rotinaId) => {
    try {
      setActionLoadingId(rotinaId);
      setModalVisible(false);

      setRotinas((prev) => prev.filter((r) => r.id !== rotinaId));
      await removerRotina(rotinaId);

      Alert.alert('Sucesso', 'Medicamento removido da rotina.');
    } catch (err) {
      console.warn('Erro ao remover rotina:', err.message);
    } finally {
      setActionLoadingId(null);
      setEditingRoutine(null);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER SUPERIOR IDÊNTICO AO FIGMA */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => onNavigate && onNavigate('Home')}
            activeOpacity={0.8}
          >
            <Text style={styles.heartIcon}>♡</Text>
          </TouchableOpacity>

          <View style={styles.topTitleContainer}>
            <Text style={styles.topSubtitle}>CUIDADO ATIVO</Text>
            <Text style={styles.topMainTitle}>Rotina De Remédios</Text>
          </View>

          <View style={styles.topRightIcons}>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Notificações', 'Sem novos alertas de atraso.')}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              <View style={styles.redDotNotification} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileHeaderButton}
              onPress={() => onNavigate && onNavigate('ElderlyProfile')}
              activeOpacity={0.8}
            >
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoHeaderImg}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* CARD 1: ACOMPANHAMENTO DIÁRIO */}
        <View style={styles.dailyCard}>
          <View style={styles.dailyHeaderRow}>
            <View>
              <Text style={styles.dailySubtitle}>Acompanhamento Diário</Text>
              <Text style={styles.dailyTitle}>
                {selectedDayObj?.labelCompleta || 'Quinta-feira, 24 Out'}
              </Text>
            </View>

            <View style={styles.progressBadge}>
              <Text style={styles.progressCheckIcon}>✓</Text>
              <Text style={styles.progressBadgeText}>
                {percentualConcluido}% Concluído
              </Text>
            </View>
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

        {/* TIMELINE DE MEDICAMENTOS */}
        <View style={styles.timelineSection}>
          {loading ? (
            <ActivityIndicator
              color="#031753"
              size="large"
              style={{ marginVertical: 30 }}
            />
          ) : rotinas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💊</Text>
              <Text style={styles.emptyTitle}>Nenhum medicamento agendado</Text>
              <Text style={styles.emptySubtitle}>
                Toque no botão abaixo para adicionar a primeira medicação da rotina.
              </Text>
            </View>
          ) : (
            rotinas.map((item, index) => (
              <MedicineTimelineCard
                key={item.id}
                item={item}
                isLast={index === rotinas.length - 1}
                loadingAction={actionLoadingId === item.id}
                onConfirm={handleConfirmarIngestao}
                onEdit={handleEditRoutine}
                onTogglePause={handleTogglePause}
              />
            ))
          )}
        </View>

        {/* BOTÃO PRINCIPAL: + NOVO MEDICAMENTO */}
        <TouchableOpacity
          style={styles.addMedButton}
          onPress={handleOpenAddModal}
          activeOpacity={0.85}
        >
          <Text style={styles.addMedPlus}>⊕</Text>
          <Text style={styles.addMedText}>Novo Medicamento</Text>
        </TouchableOpacity>

        {/* Espaçamento para não sobrepor a BottomNavBar */}
        <View style={{ height: 85 }} />
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
    paddingBottom: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heartIcon: {
    fontSize: 20,
    color: '#031753',
  },
  topTitleContainer: {
    alignItems: 'center',
  },
  topSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 2,
  },
  topMainTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#031753',
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 16,
  },
  redDotNotification: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  profileHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoHeaderImg: {
    width: 22,
    height: 22,
  },
  dailyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dailyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailySubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  dailyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#031753',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  progressCheckIcon: {
    fontSize: 12,
    color: '#059669',
    fontWeight: 'bold',
    marginRight: 4,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  timelineSection: {
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  addMedButton: {
    backgroundColor: '#BA1A1A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    elevation: 4,
    shadowColor: '#BA1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addMedPlus: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  addMedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});