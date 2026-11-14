import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import { colors, typography, shadows } from '../theme';
import { usePapel } from '../context/PapelContext';
import {
  ComprovanteExclusao,
  ExclusaoError,
  FRASE_CONFIRMACAO,
  MENSAGENS_EXCLUSAO,
  PRAZO_COMPROVANTE_DIAS,
  confirmacaoValida,
} from '../services/exclusaoContaService';
import { excluirContaEDadosLocais } from '../services/limpezaLocalService';
import { avisarContaExcluida } from '../services/authSession';

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

/**
 * Figma: "Excluir Conta" (HU-022, RN-018, RNF-017). Só o titular do token pede a exclusão: a rota usa o `sub`
 * da sessão atual, então cada pessoa exclui apenas a própria conta (o familiar não exclui a conta do idoso).
 * Aceito o pedido, os dados do aparelho são apagados antes de mostrar o comprovante; "Concluir" volta à entrada.
 */
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
      const { comprovante: recebido } = await excluirContaEDadosLocais(texto, { assinaturaAtiva });
      setComprovante(recebido);
    } catch (e) {
      setErro(e instanceof ExclusaoError ? e.message : MENSAGENS_EXCLUSAO.SEM_CONEXAO);
    } finally {
      setEnviando(false);
    }
  };

  if (comprovante) {
    // Sem sessão e sem dados locais: qualquer saída desta tela leva à entrada do app.
    return (
      <ScreenWrapper>
        <AppHeader title="Excluir Conta" onNavigate={avisarContaExcluida} />
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
          <TouchableOpacity style={styles.danger} onPress={avisarContaExcluida} accessibilityRole="button" testID="exclusao-concluir">
            <Text style={styles.dangerTexto}>Concluir</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <AppHeader title="Excluir Conta" onNavigate={onNavigate} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={[styles.badge, { backgroundColor: colors.peachBg }]}>
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
              <View style={[styles.badge, styles.badgePequeno, { backgroundColor: colors.peachBg }]}>
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
          <Text style={styles.label}>Digite {FRASE_CONFIRMACAO} para confirmar</Text>
          <View style={styles.campo}>
            <Icon name="keyboard" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              value={texto}
              onChangeText={(t) => {
                setTexto(t);
                if (erro) setErro('');
              }}
              placeholder={FRASE_CONFIRMACAO}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!assinaturaAtiva && !enviando}
              accessibilityLabel={`Digite ${FRASE_CONFIRMACAO} para confirmar`}
              testID="exclusao-campo"
            />
          </View>

          {Boolean(erro) && (
            <Text style={styles.erro} accessibilityRole="alert" testID="exclusao-erro">
              {erro}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.danger, !habilitado && styles.desabilitado]}
            onPress={excluir}
            disabled={!habilitado}
            accessibilityRole="button"
            accessibilityState={{ disabled: !habilitado }}
            testID="exclusao-confirmar"
          >
            {enviando ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name="delete" size={22} color={colors.white} />
                <Text style={styles.dangerTexto}>Excluir definitivamente</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelar} onPress={voltar} accessibilityRole="button" testID="exclusao-cancelar">
            <Text style={styles.cancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNavBar currentScreen="DeleteAccount" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 20, gap: 12, ...shadows.tier1 },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  badgePequeno: { width: 48, height: 48, borderRadius: 24 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  subtitle: { fontSize: 18, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  body: { fontSize: 16, lineHeight: 24, color: colors.onSurface, fontFamily: typography.fontFamily.body },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linhaTitulo: { fontSize: 16, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  linhaSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  assinatura: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder },
  assinaturaTexto: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.amber.textDark, fontFamily: typography.fontFamily.body },
  label: { fontSize: 16, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.body },
  campo: { minHeight: 56, borderRadius: 16, backgroundColor: colors.surfaceSubtle, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  input: { flex: 1, minHeight: 52, fontSize: 18, fontWeight: '700', color: colors.onSurface, fontFamily: typography.fontFamily.body },
  erro: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: colors.coralDark, fontFamily: typography.fontFamily.body },
  danger: { minHeight: 56, borderRadius: 9999, backgroundColor: colors.coralDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dangerTexto: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  desabilitado: { opacity: 0.45 },
  cancelar: { minHeight: 56, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelarTexto: { fontSize: 18, fontWeight: '700', color: colors.textSecondary, fontFamily: typography.fontFamily.heading },
  protocolo: { fontSize: 16, fontWeight: '700', color: colors.primary, fontFamily: typography.fontFamily.body },
  simulado: { fontSize: 14, fontWeight: '700', color: colors.amber.textDark, fontFamily: typography.fontFamily.body },
});
