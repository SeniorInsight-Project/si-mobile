import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import Icon from './Icon';
import IconButton from './IconButton';
import Button from './Button';
import { colors, font, rounded, shadows } from '../theme';
import { ScoreBemEstar, FaixaScore, ExplicacaoMotivo } from '../services/riskScoreService';

export interface SemaforoMotivoModalProps {
  visible: boolean;
  scoreData: ScoreBemEstar | null;
  onClose: () => void;
  telefoneEmergencia?: string;
}

/**
 * Modal explicativo do Semáforo do Bem-Estar (HU-033 e RN-017).
 * Exceção §2.10: mantém layout de card central com colors.overlay, tokens de raio e IconButton 48.
 */
export default function SemaforoMotivoModal({
  visible,
  scoreData,
  onClose,
  telefoneEmergencia = '192',
}: SemaforoMotivoModalProps) {
  if (!scoreData) return null;

  const faixa: Partial<FaixaScore> = scoreData.faixa || {};
  const explicacao: Partial<ExplicacaoMotivo> = scoreData.explicacao || {};
  const fatores = explicacao.fatores || [];
  const isCritico = faixa.codigo === 'CRITICO';
  const isAtencao = faixa.codigo === 'ATENCAO';

  const handleLigarEmergencia = () => {
    Linking.openURL(`tel:${telefoneEmergencia}`).catch((err) =>
      console.warn('Não foi possível abrir o discador:', err)
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* CABEÇALHO */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: faixa.corFundo || colors.mint.background },
                ]}
              >
                <Icon
                  name={faixa.icone || 'check'}
                  size={20}
                  color={faixa.cor || colors.success}
                />
              </View>
              <View>
                <Text style={styles.headerTitle}>Semáforo do Bem-Estar</Text>
                <Text style={styles.headerSubtitle}>Motivo da Análise</Text>
              </View>
            </View>

            <IconButton
              icon="close"
              variant="neutral"
              accessibilityLabel="Fechar modal de explicação do semáforo"
              onPress={onClose}
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* CARD DE SCORE E FAIXA */}
            <View
              style={[
                styles.scoreBannerCard,
                {
                  backgroundColor: faixa.corFundo || colors.mint.background,
                  borderColor: faixa.corBorda || colors.mint.border,
                },
              ]}
            >
              <View style={styles.scoreRow}>
                <View>
                  <Text style={[styles.scoreBadgeTitle, { color: faixa.corTexto || colors.mint.textDark }]}>
                    {faixa.titulo || 'Estável'}
                  </Text>
                  <Text style={styles.scoreBadgeSub}>{faixa.statusGeral || 'Sinais Estáveis'}</Text>
                </View>
                <View
                  style={[
                    styles.scorePill,
                    { backgroundColor: faixa.cor || colors.successDark },
                  ]}
                >
                  <Text style={styles.scorePillText}>Score {scoreData.score ?? 18}</Text>
                </View>
              </View>
            </View>

            {/* SEÇÃO LINGUAGEM SIMPLES (HU-033) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>O que mudou hoje?</Text>
              <Text style={styles.sectionSubtitle}>
                Entenda os fatores em linguagem simples sem jargões médicos:
              </Text>

              <View style={styles.fatoresContainer}>
                {fatores.map((fator: string, index: number) => (
                  <View key={`fator-${index}`} style={styles.fatorItem}>
                    <View style={styles.fatorDot}>
                      <Icon
                        name={isCritico ? 'emergency' : isAtencao ? 'warning' : 'check'}
                        size={16}
                        color={faixa.cor || colors.successDark}
                      />
                    </View>
                    <Text style={styles.fatorText}>{fator}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* RECOMENDAÇÃO DE AÇÃO */}
            {explicacao.recomendacaoAcao && (
              <View
                style={[
                  styles.recomendacaoCard,
                  isCritico && styles.recomendacaoCardCritico,
                ]}
              >
                <Icon
                  name={isCritico ? 'crisis_alert' : 'info'}
                  size={18}
                  color={isCritico ? colors.coralDark : colors.primaryNavy}
                />
                <Text
                  style={[
                    styles.recomendacaoText,
                    isCritico && styles.recomendacaoTextCritico,
                  ]}
                >
                  {explicacao.recomendacaoAcao}
                </Text>
              </View>
            )}

            {/* BOTÃO LIGAR SAMU 192 (EM CASO CRÍTICO - RN-017 / HU-035) */}
            {isCritico && (
              <Button
                title="Ligar para o SAMU (192)"
                onPress={handleLigarEmergencia}
                variant="sos"
                iconLeft="call"
                accessibilityLabel="Acionar SAMU 192"
              />
            )}

            {/* AVISO MÉDICO OBRIGATÓRIO (RN-017) */}
            <View style={styles.avisoMedicoBox}>
              <View style={styles.avisoMedicoHeader}>
                <Icon name="stethoscope" size={16} color={colors.amber.textDark} />
                <Text style={styles.avisoMedicoTitle}>Aviso Regulatório</Text>
              </View>
              <Text style={styles.avisoMedicoText}>
                {explicacao.avisoMedico ||
                  'Informação de apoio ao cuidado; não substitui avaliação médica.'}
              </Text>
            </View>
          </ScrollView>

          {/* BOTÃO FECHAR */}
          <View style={styles.modalFooter}>
            <Button
              title="Entendi"
              onPress={onClose}
              variant="primary"
              accessibilityLabel="Entendido, fechar detalhes do semáforo"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    maxHeight: '85%',
    overflow: 'hidden',
    ...shadows.tier3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 400),
  },
  scrollBody: {
    padding: 20,
    gap: 16,
  },
  scoreBannerCard: {
    borderRadius: rounded.xl,
    borderWidth: 1.5,
    padding: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBadgeTitle: {
    fontSize: 20,
    ...font('heading', 800),
  },
  scoreBadgeSub: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    ...font('body', 400),
  },
  scorePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
  },
  scorePillText: {
    color: colors.white,
    fontSize: 14,
    ...font('heading', 800),
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    ...font('body', 400),
  },
  fatoresContainer: {
    backgroundColor: colors.canvasBase,
    borderRadius: rounded.lg,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  fatorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  fatorDot: {
    marginTop: 2,
  },
  fatorText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    ...font('body', 500),
  },
  recomendacaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sky.border,
  },
  recomendacaoCardCritico: {
    backgroundColor: colors.peach.background,
    borderColor: colors.peach.border,
  },
  recomendacaoText: {
    flex: 1,
    fontSize: 14,
    color: colors.primaryNavy,
    lineHeight: 20,
    ...font('body', 600),
  },
  recomendacaoTextCritico: {
    color: colors.error,
  },
  avisoMedicoBox: {
    backgroundColor: colors.amber.background,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.amber.border,
    padding: 14,
    gap: 6,
  },
  avisoMedicoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avisoMedicoTitle: {
    fontSize: 14,
    color: colors.amber.textDark,
    ...font('heading', 700),
  },
  avisoMedicoText: {
    fontSize: 14,
    color: colors.amber.textDark,
    lineHeight: 20,
    fontStyle: 'italic',
    ...font('body', 400),
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
});
