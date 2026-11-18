import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar, { useEspacoBarraInferior } from '../components/BottomNavBar';
import SemIdosoCard from '../components/SemIdosoCard';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, font, rounded, shadows } from '../theme';
import { useIdoso } from '../context/IdosoContext';
import { carregarStatusRelogioIdoso, type StatusRelogioIdoso } from '../services/relogioStatusService';
import type { AlarmeRecebido } from '../services/sosRecebidoService';
import { obterIdosoLocalPorId } from '../services/elderlyService';
import {
  listarUltimosSos,
  resumoRelogioParaFamilia,
  ROTULO_STATUS_SOS,
  sosEmAberto,
  telefoneDoIdoso,
} from '../services/acompanhamentoIdosoService';

export interface ElderlyMonitorScreenProps {
  onNavigate?: (screen: string) => void;
  onAbrirSos?: (alarmeId: string) => void;
}

function formatarDataHora(ms: number): string {
  if (!Number.isFinite(ms)) return 'Horário indisponível';
  return new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * Acompanhamento do idoso pelo familiar: só leitura (status do relógio, últimos SOS e ligar para o idoso).
 * Não dispara SOS: o pedido de socorro é só do próprio idoso, no Modo Idoso.
 */
export default function ElderlyMonitorScreen({ onNavigate, onAbrirSos }: ElderlyMonitorScreenProps) {
  const espacoInferior = useEspacoBarraInferior();
  const { idosoId, nomeIdoso } = useIdoso();
  const nome = nomeIdoso || 'o idoso';

  const [relogio, setRelogio] = useState<StatusRelogioIdoso | null>(null);
  const [erroRelogio, setErroRelogio] = useState<string | null>(null);
  const [sos, setSos] = useState<AlarmeRecebido[]>([]);
  const [erroSos, setErroSos] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!idosoId) return;
    setCarregando(true);
    setErroRelogio(null);
    setErroSos(null);
    const [r, s] = await Promise.allSettled([carregarStatusRelogioIdoso(idosoId), listarUltimosSos(idosoId)]);
    if (r.status === 'fulfilled') setRelogio(r.value);
    else {
      setRelogio(null);
      setErroRelogio('Status do relógio indisponível agora.');
    }
    if (s.status === 'fulfilled') setSos(s.value);
    else {
      setSos([]);
      setErroSos(s.reason?.message || 'Não foi possível carregar os pedidos de socorro agora.');
    }
    setCarregando(false);
  }, [idosoId]);

  useEffect(() => {
    setRelogio(null);
    setSos([]);
    carregar();
  }, [carregar]);

  const telefone = idosoId ? telefoneDoIdoso(obterIdosoLocalPorId(idosoId)?.celular) : null;

  const ligarParaIdoso = () => {
    if (!telefone) return;
    Linking.openURL(`tel:${telefone}`).catch(() => {
      Alert.alert('Discador indisponível', `Disque manualmente para ${nome}: ${telefone}`);
    });
  };

  const resumo = relogio ? resumoRelogioParaFamilia(relogio, nome) : null;
  const sosAberto = sos.find(sosEmAberto);

  return (
    <ScreenWrapper>
      <AppHeader title="Acompanhamento" onNavigate={onNavigate} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: espacoInferior }]} showsVerticalScrollIndicator={false}>
        {!idosoId ? (
          <SemIdosoCard onNavigate={onNavigate} />
        ) : (
          <>
            <View style={styles.avisoLeitura} testID="acompanhamento-somente-leitura">
              <Icon name="visibility" size={18} color={colors.primary} />
              <Text style={styles.avisoLeituraTexto}>
                Aqui você acompanha {nome}. O botão de SOS fica só no celular do idoso.
              </Text>
            </View>

            {/* Status do relógio */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="watch" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Relógio</Text>
              </View>
              {carregando && !relogio ? (
                <ActivityIndicator color={colors.primary} />
              ) : resumo && relogio ? (
                <View style={[styles.statusLinha, relogio.funcionando ? styles.statusOk : styles.statusAtencao]}>
                  <Icon
                    name={relogio.funcionando ? 'check_circle' : 'warning'}
                    size={22}
                    color={relogio.funcionando ? colors.mint.textDark : colors.amber.textDark}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.statusTitulo}>{resumo.titulo}</Text>
                    <Text style={styles.statusSub}>{resumo.subtitulo}</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.erroTexto}>{erroRelogio || 'Status do relógio indisponível agora.'}</Text>
              )}
            </View>

            {/* Últimos SOS */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Icon name="crisis_alert" size={20} color={colors.coralDark} />
                <Text style={styles.cardTitle}>Últimos pedidos de socorro</Text>
              </View>
              {carregando && sos.length === 0 && !erroSos ? (
                <ActivityIndicator color={colors.primary} />
              ) : erroSos ? (
                <Text style={styles.erroTexto}>{erroSos}</Text>
              ) : sos.length === 0 ? (
                <Text style={styles.vazioTexto}>Nenhum pedido de socorro registrado.</Text>
              ) : (
                <View style={styles.lista}>
                  {sos.map((a) => (
                    <View key={a.id} style={styles.sosLinha} testID={`acompanhamento-sos-${a.id}`}>
                      <View style={[styles.sosPonto, sosEmAberto(a) ? styles.sosPontoAberto : styles.sosPontoFechado]} />
                      <View style={styles.flex}>
                        <Text style={styles.sosStatus}>{ROTULO_STATUS_SOS[a.status] ?? a.status}</Text>
                        <Text style={styles.sosHora}>{formatarDataHora(a.disparadoEm)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {sosAberto && onAbrirSos ? (
                <Button
                  title="Ver chamado em aberto"
                  iconLeft="arrow_forward"
                  variant="sos"
                  onPress={() => onAbrirSos(sosAberto.id)}
                  testID="acompanhamento-abrir-sos"
                />
              ) : null}
            </View>

            {/* Ligar para o idoso */}
            <Button
              title={`Ligar para ${nome}`}
              iconLeft="call"
              variant="primary"
              size="lg"
              disabled={!telefone}
              onPress={ligarParaIdoso}
              testID="acompanhamento-ligar-idoso"
            />
            {!telefone ? (
              <Text style={styles.vazioTexto}>
                O telefone de {nome} não está no cadastro, por isso a ligação não está disponível.
              </Text>
            ) : null}

            <Button
              title="Atualizar"
              iconLeft="refresh"
              variant="ghost"
              disabled={carregando}
              onPress={carregar}
            />
          </>
        )}
      </ScrollView>

      <BottomNavBar currentScreen="ElderlyMonitor" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  avisoLeitura: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.sky.border,
    backgroundColor: colors.sky.background,
  },
  avisoLeituraTexto: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
    ...font('body', 500),
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 18,
    gap: 12,
    ...shadows.tier2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 18,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  statusLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: rounded.lg,
    borderWidth: 1,
  },
  statusOk: {
    backgroundColor: colors.mint.background,
    borderColor: colors.mint.border,
  },
  statusAtencao: {
    backgroundColor: colors.amber.background,
    borderColor: colors.amber.border,
  },
  statusTitulo: {
    fontSize: 16,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  statusSub: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 500),
  },
  erroTexto: {
    fontSize: 14,
    color: colors.coralDark,
    ...font('body', 600),
  },
  vazioTexto: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    ...font('body', 500),
  },
  lista: {
    gap: 10,
  },
  sosLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  sosPonto: {
    width: 10,
    height: 10,
    borderRadius: rounded.full,
  },
  sosPontoAberto: {
    backgroundColor: colors.coralDark,
  },
  sosPontoFechado: {
    backgroundColor: colors.outlineVariant,
  },
  sosStatus: {
    fontSize: 16,
    color: colors.textPrimary,
    ...font('body', 600),
  },
  sosHora: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 400),
  },
});
