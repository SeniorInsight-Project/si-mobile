import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { colors, typography, shadows, font, rounded } from '../theme';
import { usePapel } from '../context/PapelContext';
import {
  ComprovanteExclusao,
  ExclusaoError,
  FRASE_CONFIRMACAO,
  MENSAGENS_EXCLUSAO,
  PRAZO_COMPROVANTE_DIAS,
  confirmacaoValida,
  solicitarExclusao,
} from '../services/exclusaoContaService';

export interface DeleteAccountScreenProps {
  onNavigate: (screen: string) => void;
  /** Se há assinatura paga ativa, a exclusão fica bloqueada até cancelá-la (HU-022 cenário 2). */
  assinaturaAtiva?: boolean;
}

const O_QUE_SERA_APAGADO = [
  { icon: 'person_off', titulo: 'Cadastro, rede e consentimentos', detalhe: 'Apagados de todos os serviços' },
  { icon: 'vital_signs', titulo: 'Medições dos wearables', detalhe: 'Só a telemetria anonimizada permanece' },
  { icon: 'description', titulo: 'Relatórios e exportações', detalhe: 'Excluídos junto com a conta' },
];

/** Figma: "Excluir Conta" (HU-022, RN-018, RNF-017). Vale para o idoso e para o familiar administrador. */
export default function DeleteAccountScreen({ onNavigate, assinaturaAtiva = false }: DeleteAccountScreenProps) {
  const papel = usePapel();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [comprovante, setComprovante] = useState<ComprovanteExclusao | null>(null);

  const voltar = () => onNavigate(papel === 'IDOSO' ? 'ElderlyData' : 'Family');
  const habilitado = confirmacaoValida(texto) && !assinaturaAtiva && !enviando;

  const excluir = async () => {
    if (!habilitado) return;
    setErro('');
    setEnviando(true);
    try {
      setComprovante(await solicitarExclusao(texto, { assinaturaAtiva }));
    } catch (e) {
      setErro(e instanceof ExclusaoError ? e.message : MENSAGENS_EXCLUSAO.SEM_CONEXAO);
    } finally {
      setEnviando(false);
    }
  };

  if (comprovante) {
    return (
      <ScreenWrapper>
        <AppHeader title="Excluir Conta" onNavigate={onNavigate} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card} testID="exclusao-concluida">
            <View style={[styles.badge, { backgroundColor: colors.mintBg }]}>
              <Icon name="check_circle" size={28} color={colors.successDark} />
            </View>
            <Text style={styles.title}>Pedido de exclusão enviado</Text>
            <Text style={styles.body}>
              A rede foi avisada e o seu acesso termina agora. Você recebe o comprovante em até{' '}
              {comprovante.prazoDias} dias.
            </Text>
            <Text style={styles.protocolo}>Protocolo: {comprovante.protocolo}</Text>
            {comprovante.simulado && (
              <Text style={styles.simulado} testID="exclusao-simulada">
                Modo de desenvolvimento: nada foi enviado ao servidor.
              </Text>
            )}
          </View>
          <Button
            title="Concluir"
            variant="danger"
            size="lg"
            onPress={() => onNavigate('Logout')}
            testID="exclusao-concluir"
          />
        </ScrollView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <AppHeader title="Excluir Conta" onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: colors.peach.background }]}>
            <Icon name="delete" size={28} color={colors.coralDark} />
          </View>
          <Text style={styles.title}>Excluir a conta e os dados</Text>
          <Text style={styles.body}>
            A exclusão é definitiva. A rede é avisada, o acesso termina e você recebe o comprovante em até{' '}
            {PRAZO_COMPROVANTE_DIAS} dias.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>O que será apagado</Text>
          {O_QUE_SERA_APAGADO.map((item) => (
            <View key={item.titulo} style={styles.linha}>
              <View style={[styles.badge, styles.badgePequeno, { backgroundColor: colors.peach.background }]}>
                <Icon name={item.icon} size={22} color={colors.coralDark} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.linhaTitulo}>{item.titulo}</Text>
                <Text style={styles.linhaSub}>{item.detalhe}</Text>
              </View>
            </View>
          ))}
        </View>

        {assinaturaAtiva && (
          <View style={styles.assinatura} testID="exclusao-assinatura">
            <Icon name="credit_card" size={20} color={colors.amber.textDark} />
            <Text style={styles.assinaturaTexto}>{MENSAGENS_EXCLUSAO.ASSINATURA_ATIVA}</Text>
          </View>
        )}

        <View style={styles.card}>
          <TextField
            label={`Digite ${FRASE_CONFIRMACAO} para confirmar`}
            icon="keyboard"
            value={texto}
            onChangeText={(t) => {
              setTexto(t);
              if (erro) setErro('');
            }}
            placeholder={FRASE_CONFIRMACAO}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!assinaturaAtiva && !enviando}
            accessibilityLabel={`Digite ${FRASE_CONFIRMACAO} para confirmar`}
            error={erro || undefined}
            testID="exclusao-campo"
            style={{ marginBottom: 0 }}
          />

          <Button
            title="Excluir definitivamente"
            iconLeft="delete"
            variant="danger"
            size="lg"
            loading={enviando}
            disabled={!habilitado}
            onPress={excluir}
            testID="exclusao-confirmar"
          />

          <Button
            title="Cancelar"
            variant="secondary"
            size="lg"
            onPress={voltar}
            testID="exclusao-cancelar"
          />
        </View>
      </ScrollView>
      <BottomNavBar currentScreen="DeleteAccount" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: rounded.card, padding: 20, gap: 12, ...shadows.tier1 },
  badge: { width: 56, height: 56, borderRadius: rounded.full, alignItems: 'center', justifyContent: 'center' },
  badgePequeno: { width: 48, height: 48, borderRadius: rounded.full },
  title: { fontSize: 24, lineHeight: 30,  color: colors.primary, ...font('heading', 800) },
  subtitle: { fontSize: 18,  color: colors.primary, ...font('heading', 800) },
  body: { fontSize: 16, lineHeight: 24, color: colors.textPrimary, ...font('body', 400) },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linhaTitulo: { fontSize: 16,  color: colors.primary, ...font('heading', 800) },
  linhaSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, ...font('body', 400) },
  assinatura: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: rounded.lg, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder },
  assinaturaTexto: { flex: 1, fontSize: 14, lineHeight: 20,  color: colors.amber.textDark, ...font('body', 600) },
  label: { fontSize: 16,  color: colors.primary, ...font('body', 700) },
  campo: { minHeight: 56, borderRadius: rounded.lg, backgroundColor: colors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, minHeight: 52, fontSize: 18,  color: colors.textPrimary, ...font('body', 700) },
  erro: { fontSize: 14, lineHeight: 20,  color: colors.coralDark, ...font('body', 700) },
  danger: { minHeight: 56, borderRadius: rounded.full, backgroundColor: colors.coralDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dangerTexto: { fontSize: 18,  color: colors.white, ...font('heading', 700) },
  desabilitado: { opacity: 0.45 },
  cancelar: { minHeight: 56, borderRadius: rounded.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelarTexto: { fontSize: 18,  color: colors.textSecondary, ...font('heading', 700) },
  protocolo: { fontSize: 16,  color: colors.primary, ...font('body', 700) },
  simulado: { fontSize: 14,  color: colors.amber.textDark, ...font('body', 700) },
});
