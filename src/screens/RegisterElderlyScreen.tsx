import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar, { useEspacoBarraInferior } from '../components/BottomNavBar';
import InputField from '../components/InputField';
import Icon from '../components/Icon';
import Button from '../components/Button';
import ChoiceChip from '../components/ChoiceChip';
import { colors, typography, shadows, font, rounded } from '../theme';
import type { Idoso } from '../services/elderlyService';
import { CadastroIdosoError, cadastrarIdoso } from '../services/idosoCadastroService';
import {
  CadastroIdosoErros,
  IDADE_MINIMA_SCORE,
  calcularIdade,
  formatarCelular,
  formatarData,
  validarCadastroIdoso,
  SEXOS_IDOSO,
} from '../services/cadastroIdosoValidacao';

export interface RegisterElderlyScreenProps {
  onNavigate: (screen: string) => void;
  onCadastrado: (idoso: Idoso) => void;
}

const SEXOS = SEXOS_IDOSO;

/** Figma: "Cadastrar Idoso" — passo 1 de 2 (HU-008). */
export default function RegisterElderlyScreen({ onNavigate, onCadastrado }: RegisterElderlyScreenProps) {
  const espacoInferior = useEspacoBarraInferior();
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
      <AppHeader title="Cadastrar idoso" onNavigate={onNavigate} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: espacoInferior }]} keyboardShouldPersistTaps="handled">
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
              {SEXOS.map((sexo) => (
                <ChoiceChip
                  key={sexo}
                  label={sexo.toUpperCase()}
                  selected={form.sexo === sexo}
                  onPress={() => alterar('sexo', sexo)}
                />
              ))}
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

          <Button
            title="Salvar e gerar código"
            iconLeft="qr_code"
            variant="primary"
            size="lg"
            loading={salvando}
            disabled={salvando}
            onPress={salvar}
            testID="cadastro-salvar"
          />
          <Text style={styles.footnote}>Campos obrigatórios: nome, data de nascimento, sexo e celular.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: rounded.xl, padding: 20, gap: 10, ...shadows.tier1 },
  stepChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: rounded.full,
    backgroundColor: colors.skyBg,
  },
  stepText: { fontSize: 14,  color: colors.primary, ...font('body', 700) },
  title: { fontSize: 24,  color: colors.primary, ...font('heading', 800) },
  subtitle: { fontSize: 16, lineHeight: 24, color: colors.textSecondary, ...font('body', 400) },
  fieldLabel: { fontSize: 14,  color: colors.primary, ...font('body', 600) },
  sexoRow: { flexDirection: 'row', gap: 8 },
  sexoChip: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 18,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexoChipActive: { backgroundColor: colors.primary },
  sexoText: { fontSize: 14,  color: colors.textSecondary, ...font('body', 700) },
  sexoTextActive: { color: colors.white },
  error: { fontSize: 14, color: colors.coralDark,  ...font('body', 600) },
  warning: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: rounded.lg,
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: colors.amberBorder,
  },
  warningText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.amber.textDark, ...font('body', 400) },
  submit: {
    minHeight: 56,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { fontSize: 18,  color: colors.white, ...font('heading', 700) },
  footnote: { fontSize: 14, color: colors.textSecondary, ...font('body', 400) },
});
