import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import Icon from './Icon';
import { typography } from '../theme';

/**
 * Modal explicativo do Semáforo do Bem-Estar (HU-033 e RN-017).
 * Apresenta os motivos da classificação em linguagem simples,
 * recomendações e o aviso médico obrigatório.
 */
export default function SemaforoMotivoModal({
  visible,
  scoreData,
  onClose,
  telefoneEmergencia = '192',
}) {
  if (!scoreData) return null;

  const faixa = scoreData.faixa || {};
  const explicacao = scoreData.explicacao || {};
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
                  { backgroundColor: faixa.corFundo || '#E8F8F0' },
                ]}
              >
                <Icon
                  name={faixa.icone || 'check'}
                  size={20}
                  color={faixa.cor || '#10B981'}
                />
              </View>
              <View>
                <Text style={styles.headerTitle}>Semáforo do Bem-Estar</Text>
                <Text style={styles.headerSubtitle}>Motivo da Análise</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Fechar modal de explicação do semáforo"
              accessibilityRole="button"
            >
              <Icon name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* CARD DE SCORE E FAIXA (Contemporary Tactile) */}
            <View
              style={[
                styles.scoreBannerCard,
                {
                  backgroundColor: faixa.corFundo || '#E8F8F0',
                  borderColor: faixa.corBorda || '#B8ECD3',
                },
              ]}
            >
              <View style={styles.scoreRow}>
                <View>
                  <Text style={[styles.scoreBadgeTitle, { color: faixa.corTexto || '#003B26' }]}>
                    {faixa.titulo || 'Estável'}
                  </Text>
                  <Text style={styles.scoreBadgeSub}>{faixa.statusGeral || 'Sinais Estáveis'}</Text>
                </View>
                <View
                  style={[
                    styles.scorePill,
                    { backgroundColor: faixa.cor || '#10B981' },
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
                {fatores.map((fator, index) => (
                  <View key={`fator-${index}`} style={styles.fatorItem}>
                    <View style={styles.fatorDot}>
                      <Icon
                        name={isCritico ? 'emergency' : isAtencao ? 'warning' : 'check'}
                        size={14}
                        color={faixa.cor || '#10B981'}
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
                  color={isCritico ? '#B51C13' : '#1E3A8A'}
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
              <TouchableOpacity
                style={styles.botaoLigarEmergencia}
                onPress={handleLigarEmergencia}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Acionar SAMU 192"
              >
                <Icon name="call" size={20} color="#FFFFFF" />
                <Text style={styles.botaoLigarEmergenciaText}>Ligar para o SAMU (192)</Text>
              </TouchableOpacity>
            )}

            {/* AVISO MÉDICO OBRIGATÓRIO (RN-017) */}
            <View style={styles.avisoMedicoBox}>
              <View style={styles.avisoMedicoHeader}>
                <Icon name="stethoscope" size={16} color="#92400E" />
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
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onClose}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Entendido, fechar detalhes do semáforo"
            >
              <Text style={styles.primaryButtonText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 23, 83, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  scrollBody: {
    padding: 20,
    gap: 16,
  },
  scoreBannerCard: {
    borderRadius: 20,
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
    fontWeight: '800',
    fontFamily: typography.fontFamily.heading,
  },
  scoreBadgeSub: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    fontFamily: typography.fontFamily.body,
  },
  scorePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  scorePillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    fontFamily: typography.fontFamily.heading,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    fontFamily: typography.fontFamily.body,
  },
  fatoresContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
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
    color: '#1E293B',
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: typography.fontFamily.body,
  },
  recomendacaoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  recomendacaoCardCritico: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  recomendacaoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '600',
    lineHeight: 18,
    fontFamily: typography.fontFamily.body,
  },
  recomendacaoTextCritico: {
    color: '#B91C1C',
  },
  botaoLigarEmergencia: {
    backgroundColor: '#B51C13',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#B51C13',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  botaoLigarEmergenciaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  avisoMedicoBox: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE8B3',
    padding: 14,
    gap: 6,
  },
  avisoMedicoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avisoMedicoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: typography.fontFamily.heading,
  },
  avisoMedicoText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
    fontStyle: 'italic',
    fontFamily: typography.fontFamily.body,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#031753',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
});
