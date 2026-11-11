import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking, StyleSheet } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import Icon from '../components/Icon';
import { colors, typography, shadows } from '../theme';
import {
  Alerta,
  AlertaError,
  Avaliacao,
  AvaliacaoBloqueadaError,
  AVISO_NAO_DIAGNOSTICO,
  FiltroAlerta,
  TELEFONE_SAMU,
  aplicarAvaliacao,
  enviarAvaliacao,
  filtrarAlertas,
  formatarHoraAlerta,
  listarAlertas,
  podeAlterarAvaliacao,
} from '../services/alertaService';

export interface AlertsCenterScreenProps {
  onNavigate: (screen: string) => void;
  idosoId: string;
  /** Abre o SOS recebido do chamado indicado. */
  onAbrirSos: (alarmeId: string) => void;
  nomeIdoso?: string;
  /** Sem telefone conhecido não há botão de ligar para o idoso (nada é inventado); o 192 continua. */
  telefoneIdoso?: string;
}

const FILTROS: Array<{ id: FiltroAlerta; rotulo: string }> = [
  { id: 'TODOS', rotulo: 'TODOS' },
  { id: 'CRITICOS', rotulo: 'CRÍTICOS' },
  { id: 'ATENCAO', rotulo: 'ATENÇÃO' },
  { id: 'TECNICOS', rotulo: 'TÉCNICOS' },
];

/** Figma: "Central de Alertas" (HU-034, HU-035, HU-037, RN-010, RN-017). Só o familiar chega aqui. */
export default function AlertsCenterScreen({
  onNavigate,
  idosoId,
  onAbrirSos,
  nomeIdoso = 'o idoso',
  telefoneIdoso,
}: AlertsCenterScreenProps) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [filtro, setFiltro] = useState<FiltroAlerta>('TODOS');
  const [aviso, setAviso] = useState('');
  // alerta em que o familiar marcou "Alarme falso" e está escrevendo o motivo
  const [editandoMotivo, setEditandoMotivo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga('');
    try {
      setAlertas(await listarAlertas(idosoId));
    } catch (e) {
      setAlertas([]);
      setErroCarga(e instanceof AlertaError ? e.message : 'Não foi possível carregar os alertas agora.');
    } finally {
      setCarregando(false);
    }
  }, [idosoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = useMemo(() => filtrarAlertas(alertas, filtro), [alertas, filtro]);

  const ligar = (numero: string, nome: string) => {
    Linking.openURL(`tel:${numero.replace(/\D/g, '')}`).catch(() =>
      Alert.alert('Discador indisponível', `Ligue manualmente para ${nome}: ${numero}`)
    );
  };

  const avaliar = async (alerta: Alerta, avaliacao: Avaliacao, textoMotivo = '') => {
    let atualizado: Alerta;
    try {
      atualizado = aplicarAvaliacao(alerta, avaliacao, textoMotivo);
    } catch (erro) {
      setAviso(erro instanceof AvaliacaoBloqueadaError ? erro.message : 'Não foi possível salvar a avaliação.');
      return;
    }
    // Marca já na tela, mas só vale se o servidor aceitar: se falhar, volta ao que era.
    setAlertas((lista) => lista.map((a) => (a.id === alerta.id ? atualizado : a)));
    setEditandoMotivo(null);
    setMotivo('');
    setAviso('');
    try {
      await enviarAvaliacao(idosoId, atualizado);
    } catch (erro) {
      setAlertas((lista) => lista.map((a) => (a.id === alerta.id ? alerta : a)));
      setAviso(erro instanceof AlertaError ? erro.message : 'Não foi possível salvar sua resposta.');
    }
  };

  const botoesAvaliacao = (alerta: Alerta) => {
    if (alerta.avaliacao && editandoMotivo !== alerta.id) {
      const pode = podeAlterarAvaliacao(alerta.avaliadoEm);
      return (
        <View style={styles.avaliado} testID={`alerta-avaliado-${alerta.id}`}>
          <Text style={styles.avaliadoTexto}>
            Você marcou: {alerta.avaliacao === 'UTIL' ? 'Foi útil' : 'Alarme falso'}
            {alerta.motivoAvaliacao ? ` — ${alerta.motivoAvaliacao}` : ''}
          </Text>
          {pode && (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => setAlertas((l) => l.map((a) => (a.id === alerta.id ? { ...a, avaliacao: undefined } : a)))}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Alterar</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    if (editandoMotivo === alerta.id) {
      return (
        <View style={styles.motivoBox}>
          <TextInput
            style={styles.motivoInput}
            placeholder="Por que foi alarme falso? (opcional)"
            placeholderTextColor={colors.textSecondary}
            value={motivo}
            onChangeText={setMotivo}
            multiline
            testID={`alerta-motivo-${alerta.id}`}
          />
          <TouchableOpacity
            style={styles.salvarMotivo}
            onPress={() => avaliar(alerta, 'FALSO', motivo)}
            accessibilityRole="button"
            testID={`alerta-salvar-${alerta.id}`}
          >
            <Text style={styles.salvarMotivoTexto}>Salvar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.avaliacaoRow}>
        <TouchableOpacity
          style={styles.avaliarBtn}
          onPress={() => avaliar(alerta, 'UTIL')}
          accessibilityRole="button"
          testID={`alerta-util-${alerta.id}`}
        >
          <Icon name="thumb_up" size={18} color={colors.successDark} />
          <Text style={[styles.avaliarTexto, { color: colors.successDark }]}>Foi útil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avaliarBtn}
          onPress={() => setEditandoMotivo(alerta.id)}
          accessibilityRole="button"
          testID={`alerta-falso-${alerta.id}`}
        >
          <Icon name="thumb_down" size={18} color={colors.textSecondary} />
          <Text style={[styles.avaliarTexto, { color: colors.textSecondary }]}>Alarme falso</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAlerta = (alerta: Alerta) => {
    const hora = formatarHoraAlerta(alerta.geradoEm);

    if (alerta.tipo === 'SOS') {
      return (
        <TouchableOpacity
          key={alerta.id}
          style={[styles.card, styles.cardCritico]}
          onPress={() => onAbrirSos(alerta.id)}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="alerta-sos"
        >
          <View style={styles.chipRow}>
            <View style={[styles.chip, styles.chipCritico]}>
              <Icon name="crisis_alert" size={14} color={colors.white} />
              <Text style={[styles.chipTexto, { color: colors.white }]}>SOS • AGORA</Text>
            </View>
            <Text style={[styles.hora, { color: colors.coralDark }]}>{hora}</Text>
          </View>
          <Text style={styles.cardTitulo}>{alerta.titulo}</Text>
          <Text style={styles.cardTexto}>{alerta.detalhe}</Text>
        </TouchableOpacity>
      );
    }

    if (alerta.tipo === 'CRITICO') {
      return (
        <View key={alerta.id} style={[styles.card, styles.cardCritico]} testID="alerta-critico">
          <View style={styles.chipRow}>
            <View style={[styles.chip, styles.chipCritico]}>
              <Icon name="emergency" size={14} color={colors.white} />
              <Text style={[styles.chipTexto, { color: colors.white }]}>CRÍTICO</Text>
            </View>
            <Text style={[styles.hora, { color: colors.coralDark }]}>{hora}</Text>
          </View>
          <Text style={styles.cardTitulo}>{alerta.titulo}</Text>
          <Text style={styles.cardTexto}>{alerta.detalhe}</Text>
          <View style={styles.avaliacaoRow}>
            {Boolean(telefoneIdoso) && (
              <TouchableOpacity
                style={[styles.ligarBtn, styles.ligarPrincipal]}
                onPress={() => ligar(telefoneIdoso as string, nomeIdoso)}
                accessibilityRole="button"
                testID="alerta-ligar"
              >
                <Icon name="call" size={18} color={colors.white} />
                <Text style={[styles.avaliarTexto, { color: colors.white }]}>Ligar para {nomeIdoso}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.ligarBtn, styles.ligarSamu]}
              onPress={() => ligar(TELEFONE_SAMU, 'o SAMU')}
              accessibilityRole="button"
              accessibilityLabel="Ligar para o SAMU, 192"
              testID="alerta-192"
            >
              <Text style={[styles.avaliarTexto, { color: colors.coralDark }]}>{TELEFONE_SAMU}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.aviso}>{AVISO_NAO_DIAGNOSTICO}</Text>
        </View>
      );
    }

    if (alerta.tipo === 'ATENCAO') {
      return (
        <View key={alerta.id} style={styles.card} testID="alerta-atencao">
          <View style={styles.chipRow}>
            <View style={[styles.chip, styles.chipAtencao]}>
              <Icon name="warning" size={14} color={colors.amber.textDark} />
              <Text style={[styles.chipTexto, { color: colors.amber.textDark }]}>ATENÇÃO</Text>
            </View>
            <Text style={styles.hora}>{hora}</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigate('Home')} accessibilityRole="button" testID="alerta-ver-motivo">
            <Text style={styles.cardTitulo}>{alerta.titulo}</Text>
            <Text style={styles.cardTexto}>{alerta.detalhe}</Text>
          </TouchableOpacity>
          {botoesAvaliacao(alerta)}
          <Text style={styles.aviso}>{AVISO_NAO_DIAGNOSTICO}</Text>
        </View>
      );
    }

    return (
      <View key={alerta.id} style={[styles.card, styles.cardTecnico]} testID="alerta-tecnico">
        <View style={styles.tecnicoIcon}>
          <Icon name="info" size={22} color={colors.textSecondary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.tecnicoTitulo}>{alerta.titulo}</Text>
          <Text style={styles.tecnicoSub}>
            {alerta.detalhe ? `${alerta.detalhe} • ${hora}` : hora}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <AppHeader title="Central de Alertas" onNavigate={onNavigate} />
      <View style={styles.filtros}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosContent}>
          {FILTROS.map((f) => {
            const ativo = filtro === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filtro, ativo && styles.filtroAtivo]}
                onPress={() => setFiltro(f.id)}
                accessibilityRole="tab"
                aria-selected={ativo}
                testID={`filtro-${f.id.toLowerCase()}`}
              >
                <Text style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}>{f.rotulo}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {carregando ? (
          <ActivityIndicator color={colors.primary} />
        ) : erroCarga ? (
          <View style={styles.vazio} testID="alertas-erro">
            <Icon name="error" size={32} color={colors.coralDark} />
            <Text style={[styles.vazioTexto, { color: colors.coralDark, textAlign: 'center' }]}>{erroCarga}</Text>
            <TouchableOpacity style={styles.salvarMotivo} onPress={carregar} accessibilityRole="button" testID="alertas-tentar-de-novo">
              <Text style={styles.salvarMotivoTexto}>Tentar de novo</Text>
            </TouchableOpacity>
          </View>
        ) : visiveis.length === 0 ? (
          <View style={styles.vazio} testID="alertas-vazio">
            <Icon name="check_circle" size={32} color={colors.successDark} />
            <Text style={styles.vazioTexto}>Nenhum alerta nesta categoria.</Text>
          </View>
        ) : (
          visiveis.map(renderAlerta)
        )}

        {Boolean(aviso) && (
          <Text style={styles.aviso} testID="alertas-aviso">
            {aviso}
          </Text>
        )}

        <View style={styles.silencio}>
          <Icon name="dark_mode" size={18} color={colors.primary} />
          <Text style={styles.silencioTexto}>
            Entre 22:00 e 07:00, avisos técnicos e de Atenção esperam. SOS e Crítico chegam na hora.
          </Text>
        </View>
      </ScrollView>
      <BottomNavBar currentScreen="Alerts" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filtros: { backgroundColor: colors.canvasBase },
  filtrosContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filtro: { minHeight: 48, paddingHorizontal: 18, borderRadius: 9999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  filtroAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  filtroTexto: { fontSize: 14, fontWeight: '800', color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  filtroTextoAtivo: { color: colors.white },
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 20, gap: 8, ...shadows.tier1 },
  cardCritico: { backgroundColor: colors.peachBg, borderWidth: 1, borderColor: colors.peachBorder },
  cardTecnico: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28, paddingHorizontal: 12, borderRadius: 9999 },
  chipCritico: { backgroundColor: colors.coralDark },
  chipAtencao: { backgroundColor: colors.amberBg },
  chipTexto: { fontSize: 14, fontWeight: '800', fontFamily: typography.fontFamily.body },
  hora: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  cardTitulo: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  cardTexto: { fontSize: 16, lineHeight: 24, color: colors.onSurface, fontFamily: typography.fontFamily.body },
  aviso: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  avaliacaoRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  avaliarBtn: { flex: 1, minHeight: 48, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  avaliarTexto: { fontSize: 16, fontWeight: '700', fontFamily: typography.fontFamily.heading },
  ligarBtn: { minHeight: 52, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  ligarPrincipal: { flex: 2, backgroundColor: colors.coralDark },
  ligarSamu: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.peachBorder },
  avaliado: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', minHeight: 48 },
  avaliadoTexto: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.successDark, fontFamily: typography.fontFamily.body },
  linkBtn: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { fontSize: 16, fontWeight: '700', color: colors.primary, textDecorationLine: 'underline', fontFamily: typography.fontFamily.heading },
  motivoBox: { gap: 8 },
  motivoInput: { minHeight: 72, borderRadius: 16, backgroundColor: colors.surfaceSubtle, padding: 14, fontSize: 16, color: colors.onSurface, textAlignVertical: 'top', fontFamily: typography.fontFamily.body },
  salvarMotivo: { minHeight: 48, paddingHorizontal: 24, borderRadius: 9999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  salvarMotivoTexto: { fontSize: 16, fontWeight: '700', color: colors.white, fontFamily: typography.fontFamily.heading },
  tecnicoIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center' },
  tecnicoTitulo: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.primary, fontFamily: typography.fontFamily.heading },
  tecnicoSub: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  vazio: { alignItems: 'center', gap: 8, padding: 32 },
  vazioTexto: { fontSize: 16, color: colors.textSecondary, fontFamily: typography.fontFamily.body },
  silencio: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.skyBg },
  silencioTexto: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.primary, fontFamily: typography.fontFamily.body },
});
