import { useState } from 'react';
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

const SUGGESTIONS = [
  { name: 'Hipertensão Arterial', icon: '❤️' },
  { name: 'Diabetes Tipo 2', icon: '💧' },
  { name: 'Osteoporose Leve', icon: '🧍' },
  { name: 'Doença de Alzheimer', icon: '🧠' },
  { name: 'Doença de Parkinson', icon: '⚡' },
  { name: 'Insuficiência Cardíaca', icon: '🫀' },
  { name: 'Dislipidemia (Colesterol)', icon: '🧪' },
  { name: 'Asma Crônica', icon: '🫁' },
  { name: 'Alergia a Dipirona', icon: '⚠️' },
  { name: 'Glaucoma', icon: '👁️' },
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
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Input manual */}
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🩺</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Arritmia, Artrose..."
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => handleAdd(inputText)}
              />
            </View>

            <TouchableOpacity
              style={[styles.addBtn, loading && styles.addBtnDisabled]}
              onPress={() => handleAdd(inputText)}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.addBtnText}>+ Adicionar</Text>
              )}
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {/* Sugestões Rápidas */}
          <Text style={styles.suggestionsTitle}>SUGESTÕES FREQUENTES</Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsGrid}
          >
            {SUGGESTIONS.map((item) => {
              const isAlreadyAdded = existingComorbidities.some(
                (c) => c.trim().toLowerCase() === item.name.toLowerCase()
              );

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
                  <Text style={styles.suggestionIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.suggestionText,
                      isAlreadyAdded && styles.suggestionTextDisabled,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {isAlreadyAdded && (
                    <Text style={styles.checkMark}>✓</Text>
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
    shadowRadius: 12,
    elevation: 20,
  },
  dragIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748B',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  addBtn: {
    backgroundColor: '#E53E3E',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 10,
    marginTop: 2,
  },
  suggestionsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 10,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionPillDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.5,
  },
  suggestionIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  suggestionText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  suggestionTextDisabled: {
    color: '#94A3B8',
  },
  checkMark: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
