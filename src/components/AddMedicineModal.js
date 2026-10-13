import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from './Icon';
import { colors, typography, shadows, rounded } from '../theme';

const FORMAT_OPTIONS = [
  { id: 'comprimido', label: 'Comprimido', icon: 'medication' },
  { id: 'gotas', label: 'Gotas', icon: 'water_drop' },
  { id: 'xarope', label: 'Xarope', icon: 'droplets' },
  { id: 'injecao', label: 'Injeção', icon: 'syringe' },
  { id: 'outro', label: 'Outro', icon: 'stethoscope' },
];

const QUICK_TIMES = ['08:00', '10:00', '12:00', '14:00', '18:00', '20:00', '22:00'];

const FREQUENCY_OPTIONS = [
  '1x ao dia (Diário)',
  '2x ao dia (12h/12h)',
  '3x ao dia (8h/8h)',
  'Uso Contínuo',
  'Se Necessário',
];

export default function AddMedicineModal({
  visible,
  onClose,
  onSave,
  onDelete,
  initialData = null,
  loading = false,
}) {
  const isEditing = Boolean(initialData && initialData.id);

  const [nome, setNome] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [formato, setFormato] = useState('comprimido');
  const [horario, setHorario] = useState('08:00');
  const [frequencia, setFrequencia] = useState('1x ao dia (Diário)');
  const [instrucoes, setInstrucoes] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setNome(initialData.medicamentoNome || '');
      setDosagem(initialData.dosagem || '');
      setFormato(initialData.tipoFormato || 'comprimido');
      setHorario(initialData.horario || '08:00');
      setFrequencia(initialData.frequencia || '1x ao dia (Diário)');
      setInstrucoes(initialData.instrucoes || '');
      setObservacoes(initialData.observacoes || '');
    } else {
      setNome('');
      setDosagem('');
      setFormato('comprimido');
      setHorario('08:00');
      setFrequencia('1x ao dia (Diário)');
      setInstrucoes('');
      setObservacoes('');
    }
    setErrorMessage('');
  }, [initialData, visible]);

  const handleSave = () => {
    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome do medicamento.');
      return;
    }
    if (!dosagem.trim()) {
      setErrorMessage('Por favor, informe a dosagem.');
      return;
    }
    if (!horario.trim()) {
      setErrorMessage('Por favor, informe o horário da dose.');
      return;
    }

    const payload = {
      medicamentoNome: nome.trim(),
      dosagem: dosagem.trim(),
      tipoFormato: formato,
      horario: horario.trim(),
      frequencia,
      instrucoes: instrucoes.trim() || 'Tomar conforme prescrição',
      observacoes: observacoes.trim(),
    };

    if (onSave) {
      onSave(payload, initialData?.id);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Medicamento',
      `Tem certeza que deseja remover ${nome} da rotina de cuidados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            if (onDelete && initialData?.id) {
              onDelete(initialData.id);
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header do Modal */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Icon name="medication" size={20} color={colors.primary} />
              </View>
              <Text style={styles.title}>
                {isEditing ? 'Editar Medicamento' : 'Novo Medicamento'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Mensagem de Erro */}
          {Boolean(errorMessage) && (
            <View style={styles.errorContainer}>
              <Icon name="shield_alert" size={16} color={colors.secondaryCoral} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyContent}
          >
            {/* Campo: Nome do Medicamento */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Nome do Medicamento <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Losartana Potássica"
                placeholderTextColor={colors.textMuted}
                value={nome}
                onChangeText={(text) => {
                  setNome(text);
                  if (errorMessage) setErrorMessage('');
                }}
              />
            </View>

            {/* Campo: Dosagem e Formato */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Dosagem <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 50mg • 1 comprimido ou 10ml"
                placeholderTextColor={colors.textMuted}
                value={dosagem}
                onChangeText={(text) => {
                  setDosagem(text);
                  if (errorMessage) setErrorMessage('');
                }}
              />
            </View>

            {/* Seleção do Formato */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Formato do Medicamento</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {FORMAT_OPTIONS.map((opt) => {
                  const isSelected = formato === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                      onPress={() => setFormato(opt.id)}
                      activeOpacity={0.8}
                    >
                      <View style={{ marginRight: 6 }}>
                        <Icon
                          name={opt.icon}
                          size={16}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.chipLabel,
                          isSelected && styles.chipLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Horário de Ingestão */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Horário da Dose (HH:mm) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="08:00"
                placeholderTextColor={colors.textMuted}
                value={horario}
                onChangeText={(text) => {
                  setHorario(text);
                  if (errorMessage) setErrorMessage('');
                }}
                maxLength={5}
              />
              {/* Chips rápidos de horários comuns */}
              <View style={styles.quickTimesRow}>
                {QUICK_TIMES.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.quickTimeChip,
                      horario === time && styles.quickTimeChipActive,
                    ]}
                    onPress={() => setHorario(time)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickTimeText,
                        horario === time && styles.quickTimeTextActive,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Frequência */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Frequência de Uso</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {FREQUENCY_OPTIONS.map((freq) => {
                  const isSelected = frequencia === freq;
                  return (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                      onPress={() => setFrequencia(freq)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          isSelected && styles.chipLabelActive,
                        ]}
                      >
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Instruções de Ingestão */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Instruções Clínicas</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Tomar com água após o café da manhã"
                placeholderTextColor={colors.textMuted}
                value={instrucoes}
                onChangeText={setInstrucoes}
              />
            </View>

            {/* Observações Opcionais */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Observações (Opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Medir pressão antes de tomar. Não ingerir em jejum."
                placeholderTextColor={colors.textMuted}
                value={observacoes}
                onChangeText={setObservacoes}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Botões de Ação */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.buttonInnerRow}>
                    <Icon name="check" size={16} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {isEditing ? 'Atualizar Medicamento' : 'Salvar Medicamento'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {isEditing && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <View style={styles.buttonInnerRow}>
                    <Icon name="delete" size={16} color={colors.secondaryCoral} />
                    <Text style={styles.deleteButtonText}>Excluir Medicamento</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelButtonText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 35, 105, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rounded.card,
    borderTopRightRadius: rounded.card,
    maxHeight: '90%',
    paddingBottom: 24,
    ...shadows.tier3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.sky.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.sky.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: typography.fontFamily.heading,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.peach.background,
    borderWidth: 1,
    borderColor: colors.peach.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: rounded.md,
  },
  errorText: {
    fontSize: 12,
    color: colors.peach.textDark,
    fontWeight: '600',
    flex: 1,
    fontFamily: typography.fontFamily.body,
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    fontFamily: typography.fontFamily.heading,
  },
  required: {
    color: colors.secondaryCoral,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: rounded.md,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    fontFamily: typography.fontFamily.body,
  },
  textArea: {
    height: 70,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: colors.sky.background,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  chipLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  quickTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickTimeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickTimeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickTimeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  quickTimeTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  actionButtonsContainer: {
    marginTop: 20,
    gap: 10,
  },
  saveButton: {
    height: 52,
    backgroundColor: colors.secondaryCoral,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.tier2,
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
    fontFamily: typography.fontFamily.heading,
  },
  deleteButton: {
    height: 48,
    backgroundColor: colors.peach.background,
    borderWidth: 1.5,
    borderColor: colors.peach.border,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondaryCoral,
    fontFamily: typography.fontFamily.heading,
  },
  cancelButton: {
    height: 48,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: typography.fontFamily.body,
  },
});
