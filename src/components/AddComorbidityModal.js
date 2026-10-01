import React, { useState } from 'react';
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
} from 'react-native';
import {
  Heart,
  Droplet,
  UserCheck,
  Brain,
  Zap,
  Activity,
  AlertTriangle,
  Eye,
  Stethoscope,
  X,
  Check,
} from 'lucide-react-native';

const SUGGESTIONS = [
  { name: 'Hipertensão Arterial', icon: Heart, color: '#DC2626' },
  { name: 'Diabetes Tipo 2', icon: Droplet, color: '#0284C7' },
  { name: 'Osteoporose Leve', icon: UserCheck, color: '#16A34A' },
  { name: 'Doença de Alzheimer', icon: Brain, color: '#7C3AED' },
  { name: 'Doença de Parkinson', icon: Zap, color: '#D97706' },
  { name: 'Insuficiência Cardíaca', icon: Activity, color: '#DC2626' },
  { name: 'Dislipidemia (Colesterol)', icon: Activity, color: '#4F46E5' },
  { name: 'Asma Crônica', icon: Activity, color: '#0891B2' },
  { name: 'Alergia a Dipirona', icon: AlertTriangle, color: '#9333EA' },
  { name: 'Glaucoma', icon: Eye, color: '#2563EB' },
];

export default function AddComorbidityModal({
  visible,
  onClose,
  onAdd,
  existingComorbidities = [],
  loading = false,
}) {
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdd = (nameToAdd) => {
    const trimmed = (nameToAdd || inputText).trim();

    if (!trimmed) {
      setErrorMessage('Por favor, informe o nome da comorbidade ou alerta.');
      return;
    }

    const alreadyExists = existingComorbidities.some(
      (c) => c.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
      setErrorMessage(`"${trimmed}" já está registrada nesta ficha.`);
      return;
    }

    setErrorMessage('');
    onAdd(trimmed);
    setInputText('');
  };

  const handleClose = () => {
    setInputText('');
    setErrorMessage('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.sheetContainer}>
          {/* Indicador de arrasto */}
          <View style={styles.dragIndicator} />

          {/* Header do Modal */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Adicionar Comorbidade</Text>
              <Text style={styles.subtitle}>
                Selecione uma condição comum ou digite o nome para registrar no prontuário.
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Input manual */}
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Stethoscope size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Arritmia, Artrose..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (errorMessage) setErrorMessage('');
                }}
                onSubmitEditing={() => handleAdd()}
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={[styles.addButton, loading && { opacity: 0.6 }]}
              onPress={() => handleAdd()}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.addButtonText}>Adicionar</Text>
              )}
            </TouchableOpacity>
          </View>

          {errorMessage !== '' && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}

          {/* Sugestões rápidas */}
          <Text style={styles.sectionLabel}>Sugestões Clínicas Frequentes</Text>

          <ScrollView
            style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestionsContent}
            showsVerticalScrollIndicator={false}
          >
            {SUGGESTIONS.map((item) => {
              const isAlreadyAdded = existingComorbidities.some(
                (c) => c.trim().toLowerCase() === item.name.toLowerCase()
              );
              const IconComp = item.icon;

              return (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.suggestionPill,
                    isAlreadyAdded && styles.suggestionPillDisabled,
                  ]}
                  onPress={() => !isAlreadyAdded && handleAdd(item.name)}
                  disabled={isAlreadyAdded || loading}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionIconWrapper}>
                    <IconComp size={15} color={item.color} />
                  </View>
                  <Text
                    style={[
                      styles.suggestionText,
                      isAlreadyAdded && styles.suggestionTextDisabled,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isAlreadyAdded && (
                    <Check size={14} color="#16A34A" strokeWidth={3} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 23, 83, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#031753',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  closeBtn: {
    padding: 6,
    marginLeft: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#031753',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#031753',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  suggestionsScroll: {
    maxHeight: 260,
  },
  suggestionsContent: {
    paddingBottom: 20,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionPillDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  suggestionIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  suggestionTextDisabled: {
    color: '#94A3B8',
  },
});
