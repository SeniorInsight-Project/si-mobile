import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';
import { CODIGO_MAX, CODIGO_MIN, sanitizarCodigo } from '../services/pareamentoService';

export interface PairingCodeInputProps {
  value: string;
  onChange: (valor: string) => void;
  hasError?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

/**
 * Campo do código de pareamento (6 a 8 letras e números, contrato identity-v1): caixas grandes alimentadas
 * por um único TextInput. Começa com 6 caixas e cresce até 8 se a pessoa digitar mais.
 */
export default function PairingCodeInput({ value, onChange, hasError = false, autoFocus = false, onSubmit }: PairingCodeInputProps) {
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const caracteres = sanitizarCodigo(value).split('');
  const caixas = Math.min(CODIGO_MAX, Math.max(CODIGO_MIN, caracteres.length));

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
      style={styles.row}
      testID="pairing-code-input"
    >
      {Array.from({ length: caixas }).map((_, indice) => {
        const ativo = indice === Math.min(caracteres.length, caixas - 1);
        return (
          <View
            key={indice}
            style={[styles.box, ativo && !hasError && styles.boxActive, hasError && styles.boxError]}
          >
            <Text style={styles.digit}>{caracteres[indice] ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={sanitizarCodigo(value)}
        onChangeText={(texto) => onChange(sanitizarCodigo(texto))}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="done"
        blurOnSubmit={false}
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        accessibilityLabel="Código de pareamento, 6 a 8 letras e números"
        style={styles.hiddenInput}
        caretHidden
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, position: 'relative' },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primaryNavy },
  boxError: { borderColor: colors.errorBright },
  digit: { fontSize: 28, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
});
