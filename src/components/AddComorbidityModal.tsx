import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import Icon from './Icon';
import ModalSheet from './ModalSheet';
import TextField from './TextField';
import Button from './Button';
import { colors, rounded, font } from '../theme';
import { AVISO_OUTRAS_COMORBIDADES, CONDICOES_CLINICAS_DRS } from '../services/comorbidadeService';

const CONDICOES_DRS_UI: Record<(typeof CONDICOES_CLINICAS_DRS)[number], { icon: string; color: string }> = {
  'Hipertensão': { icon: 'favorite', color: colors.peach.text },
  'Diabetes': { icon: 'water_drop', color: colors.sky.text },
  'Cardiopatia': { icon: 'monitor_heart', color: colors.coral },
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
    <ModalSheet
      visible={visible}
      onClose={handleClose}
      title="Adicionar Comorbidade"
      subtitle={'Marque condições da lista clínica (consideradas no semáforo) ou informe em "Outras".'}
    >
      {/* Lista fechada das 6 condições do DRS (HU-010 Cenário 1) */}
      <Text style={styles.sectionLabel}>Condições consideradas no semáforo</Text>

      <View style={styles.suggestionsContent}>
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
              activeOpacity={0.85}
              accessibilityRole="button"
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
              {isAlreadyAdded ? (
                <Icon name="check" size={18} color={colors.successDark} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Campo "Outras" com aviso explícito (HU-010 Cenário 2) */}
      <Text style={styles.sectionLabel}>Outras condições</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputCol}>
          <TextField
            icon="stethoscope"
            placeholder="Outras (ex: Arritmia, Artrose...)"
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              if (errorMessage) setErrorMessage('');
            }}
            onSubmitEditing={() => handleAdd()}
            returnKeyType="done"
            error={errorMessage || undefined}
            style={{ marginBottom: 0 }}
          />
        </View>
        <Button
          title="Adicionar"
          onPress={() => handleAdd()}
          variant="primary"
          fullWidth={false}
          loading={loading}
          disabled={loading}
        />
      </View>

      <View style={styles.avisoOutrasBox}>
        <Icon name="info" size={16} color={colors.amber.text} />
        <Text style={styles.avisoOutrasText}>{AVISO_OUTRAS_COMORBIDADES}</Text>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 10,
    ...font('heading', 700),
  },
  suggestionsContent: {
    gap: 8,
    marginBottom: 16,
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
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    ...font('body', 600),
  },
  suggestionTextDisabled: {
    color: colors.successDark,
    ...font('body', 700),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  avisoOutrasBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.amber.background,
    borderWidth: 1,
    borderColor: colors.amber.border,
    borderRadius: rounded.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avisoOutrasText: {
    flex: 1,
    fontSize: 14,
    color: colors.amber.text,
    ...font('body', 600),
  },
});
