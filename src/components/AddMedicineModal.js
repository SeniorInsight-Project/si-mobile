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
import {
  Pill,
  Droplet,
  Droplets,
  Syringe,
  Stethoscope,
  X,
  AlertTriangle,
  Check,
  Trash2,
} from 'lucide-react-native';

const FORMAT_OPTIONS = [
  { id: 'comprimido', label: 'Comprimido', icon: Pill },
  { id: 'gotas', label: 'Gotas', icon: Droplet },
  { id: 'xarope', label: 'Xarope', icon: Droplets },
  { id: 'injecao', label: 'Injeção', icon: Syringe },
  { id: 'outro', label: 'Outro', icon: Stethoscope },
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

  // Preenche dados quando abre em modo de edição ou limpa para novo cadastro
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
    const trimmedNome = nome.trim();
    const trimmedDosagem = dosagem.trim();
    const trimmedHorario = horario.trim();

    if (!trimmedNome) {
      setErrorMessage('Por favor, informe o nome do medicamento.');
      return;
    }
    if (!trimmedDosagem) {
      setErrorMessage('Por favor, informe a dosagem (ex: 50mg ou 1 comprimido).');
      return;
    }
    if (!trimmedHorario) {
      setErrorMessage('Por favor, informe o horário de administração (ex: 08:00).');
      return;
    }

    setErrorMessage('');

    onSave({
      id: initialData?.id,
      nomeMedicamento: trimmedNome,
      medicamentoNome: trimmedNome,
      dosagem: trimmedDosagem,
      horario: trimmedHorario,
      tipoFormato: formato,
      frequencia,
      instrucoes: instrucoes.trim() || 'Conforme orientação médica',
      observacoes: observacoes.trim(),
      diasSemana: 'TODOS',
      ativo: initialData?.ativo !== undefined ? initialData.ativo : true,
    });
  };

  const handleDelete = () => {
    if (!initialData?.id || !onDelete) return;

    Alert.alert(
      'Excluir Medicamento',
      `Deseja realmente remover "${initialData.medicamentoNome}" da rotina diária?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => onDelete(initialData.id),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          {/* Indicador superior */}
          <View style={styles.dragIndicator} />

          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {isEditing ? 'Editar Medicamento' : 'Novo Medicamento'}
              </Text>
              <Text style={styles.subtitle}>
                Configure o horário, dosagem e instruções clínicas de administração.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mensagem de Erro */}
            {Boolean(errorMessage) && (
              <View style={styles.errorBox}>
                <AlertTriangle size={15} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Campo: Nome do Medicamento */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Nome do Medicamento <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Losartana Potássica"
                placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
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
                  const IconComp = opt.icon;
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
                      <IconComp
                        size={16}
                        color={isSelected ? '#031753' : '#64748B'}
                        style={{ marginRight: 6 }}
                      />
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
                placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
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
                    <Check size={16} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 6 }} />
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
                    <Trash2 size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteButtonText}>Excluir Medicamento</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
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
    backgroundColor: 'rgba(3, 23, 83, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  dragIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },
  formScroll: {
    paddingVertical: 4,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  required: {
    color: '#BA1A1A',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#031753',
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  chipsScroll: {
    flexDirection: 'row',
    paddingVertical: 2,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#031753',
    borderColor: '#031753',
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipLabelActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  quickTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickTimeChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  quickTimeChipActive: {
    backgroundColor: '#0284C7',
  },
  quickTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  quickTimeTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    marginTop: 10,
    marginBottom: 20,
    gap: 10,
  },
  saveButton: {
    backgroundColor: '#031753',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
