import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from './Icon';
import Checkbox from './Checkbox';
import ModalSheet from './ModalSheet';
import TextField from './TextField';
import Button from './Button';
import { colors, rounded, font } from '../theme';
import { RotinaMedicamento } from '../services/medicamentoService';
import { formatarHorarioInput, normalizarHorario } from '../services/timeFormat';

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

export interface MedicinePayload {
  nomeMedicamento: string;
  medicamentoNome: string;
  dosagem: string;
  tipoFormato: string;
  horario: string;
  frequencia: string;
  instrucoes: string;
  observacoes: string;
}

export interface AddMedicineModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (payload: MedicinePayload, routineId?: string) => void;
  onDelete?: (routineId: string) => void;
  initialData?: Partial<RotinaMedicamento> | null;
  loading?: boolean;
}

export default function AddMedicineModal({
  visible,
  onClose,
  onSave,
  onDelete,
  initialData = null,
  loading = false,
}: AddMedicineModalProps) {
  const isEditing = Boolean(initialData && initialData.id);

  const [nome, setNome] = useState('');
  const [dosagem, setDosagem] = useState('');
  const [formato, setFormato] = useState('comprimido');
  const [horario, setHorario] = useState('08:00');
  const [frequencia, setFrequencia] = useState('1x ao dia (Diário)');
  const [instrucoes, setInstrucoes] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setNome(initialData.medicamentoNome || initialData.nomeMedicamento || '');
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
    setTermoAceito(false);
    setErrorMessage('');
  }, [initialData, visible]);

  const handleSave = () => {
    if (!termoAceito) {
      setErrorMessage('É obrigatório aceitar o termo de responsabilidade para salvar.');
      return;
    }
    if (!nome.trim()) {
      setErrorMessage('Por favor, informe o nome do medicamento.');
      return;
    }
    if (!dosagem.trim()) {
      setErrorMessage('Por favor, informe a dosagem.');
      return;
    }
    const horarioNormalizado = normalizarHorario(horario);
    if (!horarioNormalizado) {
      setErrorMessage('Horário inválido. Utilize o formato HH:mm (entre 00:00 e 23:59).');
      return;
    }

    const payload: MedicinePayload = {
      nomeMedicamento: nome.trim(),
      medicamentoNome: nome.trim(),
      dosagem: dosagem.trim(),
      tipoFormato: formato,
      horario: horarioNormalizado,
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
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Editar Medicamento' : 'Novo Medicamento'}
      footer={
        <View style={styles.footerContainer}>
          <View style={styles.footerRow}>
            <View style={styles.footerButtonCol}>
              <Button
                title="Cancelar"
                onPress={onClose}
                variant="secondary"
                disabled={loading}
              />
            </View>
            <View style={styles.footerButtonCol}>
              <Button
                title={isEditing ? 'Atualizar' : 'Salvar'}
                onPress={handleSave}
                variant="primary"
                iconLeft="check"
                loading={loading}
                disabled={!termoAceito || loading}
              />
            </View>
          </View>
          {isEditing ? (
            <Button
              title="Excluir Medicamento"
              onPress={handleDelete}
              variant="danger"
              iconLeft="delete"
              disabled={loading}
            />
          ) : null}
        </View>
      }
    >
      {Boolean(errorMessage) && (
        <View style={styles.errorContainer}>
          <Icon name="shield_alert" size={18} color={colors.peach.text} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <TextField
        label="Nome do Medicamento *"
        placeholder="Ex: Losartana Potássica"
        value={nome}
        onChangeText={(text) => {
          setNome(text);
          if (errorMessage) setErrorMessage('');
        }}
      />

      <TextField
        label="Dosagem *"
        placeholder="Ex: 50mg • 1 comprimido ou 10ml"
        value={dosagem}
        onChangeText={(text) => {
          setDosagem(text);
          if (errorMessage) setErrorMessage('');
        }}
      />

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
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setFormato(opt.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <View style={{ marginRight: 6 }}>
                  <Icon
                    name={opt.icon}
                    size={16}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Horário de Ingestão */}
      <View style={styles.fieldGroup}>
        <TextField
          label="Horário da Dose (HH:mm) *"
          placeholder="08:00"
          value={horario}
          keyboardType="numeric"
          onChangeText={(text) => {
            const formatado = formatarHorarioInput(horario, text);
            setHorario(formatado);
            if (errorMessage) setErrorMessage('');
          }}
          maxLength={5}
          style={{ marginBottom: 8 }}
        />
        <View style={styles.quickTimesRow}>
          {QUICK_TIMES.map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.quickTimeChip,
                horario === time && styles.quickTimeChipActive,
              ]}
              onPress={() => setHorario(time)}
              activeOpacity={0.85}
              accessibilityRole="button"
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
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setFrequencia(freq)}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                  {freq}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <TextField
        label="Instruções Clínicas"
        placeholder="Ex: Tomar com água após o café da manhã"
        value={instrucoes}
        onChangeText={setInstrucoes}
      />

      <TextField
        label="Observações (Opcional)"
        placeholder="Ex: Medir pressão antes de tomar. Não ingerir em jejum."
        value={observacoes}
        onChangeText={setObservacoes}
        multiline
        numberOfLines={3}
      />

      {/* Caixa do Termo de Responsabilidade (RN-004 e HU-056 Cenário 3) */}
      <View style={styles.termoBox}>
        <Checkbox
          isChecked={termoAceito}
          onToggle={() => {
            setTermoAceito((prev) => !prev);
            if (errorMessage) setErrorMessage('');
          }}
        >
          <Text style={styles.termoText}>
            Declaro que as informações e dosagens cadastradas foram prescritas por profissional médico habilitado e assumo total responsabilidade pela sua exatidão.
          </Text>
        </Checkbox>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.peach.background,
    borderWidth: 1,
    borderColor: colors.peach.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderRadius: rounded.input,
  },
  errorText: {
    fontSize: 14,
    color: colors.peach.textDark,
    flex: 1,
    ...font('body', 600),
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    ...font('body', 600),
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
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
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  chipLabelActive: {
    color: colors.primary,
    ...font('body', 700),
  },
  quickTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTimeChip: {
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTimeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickTimeText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  quickTimeTextActive: {
    color: colors.onPrimary,
    ...font('body', 700),
  },
  termoBox: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  termoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    ...font('body', 400),
  },
  footerContainer: {
    gap: 10,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButtonCol: {
    flex: 1,
  },
});
