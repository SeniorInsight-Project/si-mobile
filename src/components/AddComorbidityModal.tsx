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
import Icon from './Icon';
import { colors, typography, shadows, rounded } from '../theme';
import { AVISO_OUTRAS_COMORBIDADES, CONDICOES_CLINICAS_DRS } from '../services/comorbidadeService';

const CONDICOES_DRS_UI: Record<(typeof CONDICOES_CLINICAS_DRS)[number], { icon: string; color: string }> = {
  'Hipertensão': { icon: 'favorite', color: colors.peach.text },
  'Diabetes': { icon: 'water_drop', color: colors.sky.text },
  'Cardiopatia': { icon: 'monitor_heart', color: colors.secondaryCoral },
  'DPOC': { icon: 'vital_signs', color: colors.primaryNavy },
  'Osteoporose': { icon: 'walk', color: colors.mint.text },
  'Histórico de quedas': { icon: 'warning', color: colors.amber.text },
};

export interface AddComorbidityModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (comorbidityName: string) => void;
  existingComorbidities?: string[];
  loading?: boolean;
}

export default function AddComorbidityModal({
  visible,
  onClose,
  onAdd,
  existingComorbidities = [],
  loading = false,
}: AddComorbidityModalProps) {
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdd = (nameToAdd?: string) => {
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
                Marque condições da lista clínica (consideradas no semáforo) ou informe em "Outras".
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Fechar">
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Lista fechada das 6 condições do DRS (HU-010 Cenário 1) */}
          <Text style={styles.sectionLabel}>Condições consideradas no semáforo</Text>

          <ScrollView
            style={styles.suggestionsScroll}
            contentContainerStyle={styles.suggestionsContent}
            showsVerticalScrollIndicator={false}
          >
            {CONDICOES_CLINICAS_DRS.map((nomeCondicao) => {
              const item = CONDICOES_DRS_UI[nomeCondicao];
              const isAlreadyAdded = existingComorbidities.some(
                (c) => c.trim().toLowerCase() === nomeCondicao.toLowerCase()
              );

              return (
                <TouchableOpacity
                  key={nomeCondicao}
                  style={[
                    styles.suggestionPill,
                    isAlreadyAdded && styles.suggestionPillDisabled,
                  ]}
                  onPress={() => !isAlreadyAdded && handleAdd(nomeCondicao)}
                  disabled={isAlreadyAdded || loading}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionIconWrapper}>
                    <Icon name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text
                    style={[
                      styles.suggestionText,
                      isAlreadyAdded && styles.suggestionTextDisabled,
                    ]}
                  >
                    {nomeCondicao}
                  </Text>
                  {isAlreadyAdded && (
                    <Icon name="check" size={16} color={colors.success} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Campo "Outras" com aviso explícito (HU-010 Cenário 2) */}
          <Text style={styles.sectionLabel}>Outras condições</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <View style={{ marginRight: 8 }}>
                <Icon name="stethoscope" size={18} color={colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Outras (ex: Arritmia, Artrose...)"
                placeholderTextColor={colors.textMuted}
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

          <View style={styles.avisoOutrasBox}>
            <Icon name="info" size={16} color={colors.amber.text} />
            <Text style={styles.avisoOutrasText}>{AVISO_OUTRAS_COMORBIDADES}</Text>
          </View>

          {errorMessage !== '' && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rounded.card,
    borderTopRightRadius: rounded.card,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '80%',
    ...shadows.tier3,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: typography.fontFamily.body,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
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
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: rounded.md,
    paddingHorizontal: 12,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
    fontFamily: typography.fontFamily.body,
  },
  addButton: {
    backgroundColor: colors.primaryNavy,
    borderRadius: rounded.md,
    height: 50,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: typography.fontFamily.heading,
  },
  errorText: {
    fontSize: 12,
    color: colors.errorBright,
    fontWeight: '600',
    marginBottom: 10,
    fontFamily: typography.fontFamily.body,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 10,
    fontFamily: typography.fontFamily.heading,
  },
  suggestionsScroll: {
    maxHeight: 260,
  },
  suggestionsContent: {
    gap: 8,
    paddingBottom: 10,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rounded.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  suggestionPillDisabled: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.mint.border,
    opacity: 0.8,
  },
  suggestionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
    fontFamily: typography.fontFamily.body,
  },
  suggestionTextDisabled: {
    color: colors.successDark,
    fontWeight: '700',
  },
  avisoOutrasBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.amber.background,
    borderWidth: 1,
    borderColor: colors.amber.border,
    borderRadius: rounded.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  avisoOutrasText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.amber.text,
    fontFamily: typography.fontFamily.body,
  },
});
