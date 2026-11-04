import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import InputField from '../components/InputField';
import Icon from '../components/Icon';
import { colors, typography, shadows } from '../theme';
import type { Idoso } from '../services/elderlyService';
import { CadastroIdosoError, cadastrarIdoso } from '../services/idosoCadastroService';
import {
  CadastroIdosoErros,
  IDADE_MINIMA_SCORE,
  calcularIdade,
  formatarCelular,
  formatarData,
  validarCadastroIdoso,
} from '../services/cadastroIdosoValidacao';

export interface RegisterElderlyScreenProps {
  onNavigate: (screen: string) => void;
  onCadastrado: (idoso: Idoso) => void;
}

const SEXOS = ['Feminino', 'Masculino'];

/** Figma: "Cadastrar Idoso" — passo 1 de 2 (HU-008). */
export default function RegisterElderlyScreen({ onNavigate, onCadastrado }: RegisterElderlyScreenProps) {
  const [form, setForm] = useState({ nome: '', dataNascimento: '', sexo: '', celular: '' });
  const [erros, setErros] = useState<CadastroIdosoErros>({});
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState('');

  const idade = calcularIdade(form.dataNascimento);
  const avisoIdade = idade !== null && idade < IDADE_MINIMA_SCORE;

  const alterar = (campo: keyof typeof form, valor: string) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const salvar = async () => {
    if (salvando) return;
    const resultado = validarCadastroIdoso(form);
    setErros(resultado.erros);
    setErroGeral('');
    if (!resultado.valido) return;

    try {
      setSalvando(true);
      const idoso = await cadastrarIdoso({ nome: form.nome, dataNascimento: form.dataNascimento, sexo: form.sexo });
      onCadastrado(idoso);
      onNavigate('PairingCode');
    } catch (e) {
      setErroGeral(e instanceof CadastroIdosoError ? e.message : 'Não foi possível salvar agora. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScreenWrapper>
      <AppHeader title="Cadastrar Idoso" onNavigate={onNavigate} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.stepChip}>
              <Icon name="person_add" size={14} color={colors.primary} />
              <Text style={styles.stepText}>PASSO 1 DE 2</Text>
            </View>
            <Text style={styles.title}>Quem você vai acompanhar?</Text>
            <Text style={styles.subtitle}>
              Com esses dados o SeniorInsight calibra o semáforo e gera o código para o celular do idoso.
            </Text>
          </View>

          <View style={styles.card}>
            <InputField
              label="Nome completo"
              icon="person"
              variant="grey"
              placeholder="Nome do idoso"
              value={form.nome}
              onChangeText={(t) => alterar('nome', t)}
              autoCapitalize="words"
              testID="cadastro-nome"
            />
            {erros.nome && <Text style={styles.error}>{erros.nome}</Text>}

            <InputField
              label="Data de nascimento"
              icon="calendar_month"
              variant="grey"
              placeholder="DD/MM/AAAA"
              value={form.dataNascimento}
              onChangeText={(t) => alterar('dataNascimento', formatarData(t))}
              keyboardType="number-pad"
              maxLength={10}
              testID="cadastro-data"
            />
            {erros.dataNascimento && <Text style={styles.error}>{erros.dataNascimento}</Text>}

            <Text style={styles.fieldLabel}>Sexo</Text>
            <View style={styles.sexoRow}>
              {SEXOS.map((sexo) => {
                const ativo = form.sexo === sexo;
                return (
                  <TouchableOpacity
                    key={sexo}
                    style={[styles.sexoChip, ativo && styles.sexoChipActive]}
                    onPress={() => alterar('sexo', sexo)}
                    accessibilityRole="radio"
                    aria-checked={ativo}
                    testID={`cadastro-sexo-${sexo.toLowerCase()}`}
                  >
                    <Text style={[styles.sexoText, ativo && styles.sexoTextActive]}>{sexo.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {erros.sexo && <Text style={styles.error}>{erros.sexo}</Text>}

            <InputField
              label="Celular do idoso (Android)"
              icon="smartphone"
              variant="grey"
              placeholder="(00) 90000-0000"
              value={form.celular}
              onChangeText={(t) => alterar('celular', formatarCelular(t))}
              keyboardType="phone-pad"
              maxLength={15}
              testID="cadastro-celular"
            />
            {erros.celular && <Text style={styles.error}>{erros.celular}</Text>}

            {avisoIdade && (
              <View style={styles.warning} testID="cadastro-aviso-idade">
                <Icon name="info" size={18} color={colors.amber.textDark} />
                <Text style={styles.warningText}>
                  O Score de Risco foi calibrado para pessoas com {IDADE_MINIMA_SCORE} anos ou mais. Você pode seguir com
                  idades menores, mas os alertas podem ser menos precisos.
                </Text>
              </View>
            )}
          </View>

          {Boolean(erroGeral) && <Text style={styles.error}>{erroGeral}</Text>}

          <TouchableOpacity
            style={[styles.submit, salvando && styles.submitDisabled]}
            onPress={salvar}
            disabled={salvando}
            activeOpacity={0.85}
            accessibilityRole="button"
            testID="cadastro-salvar"
          >
            {salvando ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name="qr_code" size={22} color={colors.white} />
                <Text style={styles.submitText}>Salvar e gerar código</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.footnote}>Campos obrigatórios: nome, data de nascimento, sexo e celular.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 110, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 20, gap: 10, ...shadows.tier1 },
  stepChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    backgroundColor: colors.skyBg,
  },
  stepText: { fontSize: 14, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.body },
  title: { fontSize: 24, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.primary, fontFamily: typography.fontFamily.body },
  sexoRow: { flexDirection: 'row', gap: 8 },
  sexoChip: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 18,
    borderRadius: 9999,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexoChipActive: { backgroundColor: colors.primary },
  sexoText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  sexoTextActive: { color: colors.white },
  error: { fontSize: 14, color: colors.coralDark, fontWeight: '600', fontFamily: typography.fontFamily.body },
  warning: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  warningText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.amber.textDark, fontFamily: typography.fontFamily.body },
  submit: {
    minHeight: 56,
    borderRadius: 9999,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  footnote: { fontSize: 14, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
});
