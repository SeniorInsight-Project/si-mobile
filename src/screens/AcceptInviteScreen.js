import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import { typography } from '../theme';
import {
  obterDetalhesConvite,
  aceitarConvite,
} from '../services/redeProtecaoService';

export default function AcceptInviteScreen({
  onNavigate,
  inviteToken = 'token-exemplo',
  isAuthenticated = false,
  currentUser = null,
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [convite, setConvite] = useState(null);
  const [erroStatus, setErroStatus] = useState(null); // 'EXPIRADO' | 'LIMITE' | 'INVALIDO' | null
  const [erroMensagem, setErroMensagem] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function carregarConvite() {
      try {
        setLoading(true);
        setErroStatus(null);
        setErroMensagem('');

        const dados = await obterDetalhesConvite(inviteToken);

        if (dados.expirado || dados.status === 'EXPIRADO') {
          setErroStatus('EXPIRADO');
          setErroMensagem(
            'Convite expirado. O prazo de validade temporal de 48 horas foi ultrapassado. Peça um novo convite ao familiar administrador.'
          );
        } else {
          setConvite(dados);
        }
      } catch (err) {
        if (err.status === 410) {
          setErroStatus('EXPIRADO');
          setErroMensagem('Convite expirado. Peça um novo convite ao familiar administrador.');
        } else if (err.status === 409) {
          setErroStatus('LIMITE');
          setErroMensagem(err.message || 'Limite de 5 familiares atingido ou vínculo já existente.');
        } else {
          setErroStatus('INVALIDO');
          setErroMensagem(err.message || 'Convite não encontrado ou inválido.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (inviteToken) {
      carregarConvite();
    }
  }, [inviteToken]);

  const handleConfirmarAceite = async () => {
    try {
      setSubmitting(true);
      await aceitarConvite(inviteToken, currentUser?.token);
      setSucesso(true);
      Alert.alert(
        'Convite Aceito!',
        `Você agora faz parte da Rede de Cuidados de ${convite?.nomeIdoso || 'Dona Maria'}.`,
        [
          {
            text: 'Acessar Rede',
            onPress: () => onNavigate && onNavigate('Family'),
          },
        ]
      );
    } catch (err) {
      if (err.status === 410) {
        setErroStatus('EXPIRADO');
        setErroMensagem('Convite expirado. Peça um novo convite ao familiar administrador.');
      } else if (err.status === 409) {
        setErroStatus('LIMITE');
        setErroMensagem(err.message || 'Você já faz parte da rede ou o limite de 5 familiares foi atingido.');
      } else {
        Alert.alert('Erro ao aceitar', err.message || 'Não foi possível confirmar o convite.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper hasHeader={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* LOGO & BRANDING */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../assets/logoComTexto.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.badgeTop}>
            <Icon name="favorite" size={13} color="#003B26" />
            <Text style={styles.badgeTopText}>CONVITE DE CUIDADO FAMILIAR</Text>
          </View>

          <Text style={styles.screenTitle}>Rede de Apoio</Text>
          <Text style={styles.screenSubtitle}>
            Junte-se à orquestração do cuidado e receba alertas vitais em tempo real.
          </Text>
        </View>

        {/* ESTADO 1: CARREGANDO */}
        {loading && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#031753" style={{ marginBottom: 12 }} />
            <Text style={styles.loadingText}>Verificando dados do convite...</Text>
          </View>
        )}

        {/* ESTADO 2: CONVITE EXPIRADO (HU-013 Cenário 2) */}
        {!loading && erroStatus === 'EXPIRADO' && (
          <View style={styles.expiredCard}>
            <View style={styles.expiredIconCircle}>
              <Icon name="schedule" size={28} color="#B51C13" />
            </View>

            <Text style={styles.expiredTitle}>Convite Expirado</Text>
            <Text style={styles.expiredDescription}>{erroMensagem}</Text>

            <View style={styles.expiredInfoBox}>
              <Icon name="shield_alert" size={16} color="#B51C13" style={{ marginRight: 6 }} />
              <Text style={styles.expiredInfoText}>
                Por segurança LGPD e integridade da rede, links temporais expiram automaticamente.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => onNavigate && onNavigate('Onboarding')}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Voltar para o Início</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ESTADO 3: LIMITE DE 5 FAMILIARES OU CONFLITO */}
        {!loading && erroStatus === 'LIMITE' && (
          <View style={styles.expiredCard}>
            <View style={[styles.expiredIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="groups" size={28} color="#D97706" />
            </View>

            <Text style={[styles.expiredTitle, { color: '#92400E' }]}>Limite da Rede</Text>
            <Text style={styles.expiredDescription}>{erroMensagem}</Text>

            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: '#031753' }]}
              onPress={() => onNavigate && onNavigate('Home')}
              activeOpacity={0.8}
            >
              <Text style={[styles.backButtonText, { color: '#FFFFFF' }]}>Acessar Meu Painel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ESTADO 4: CONVITE INVÁLIDO OU ERRO GENÉRICO */}
        {!loading && erroStatus === 'INVALIDO' && (
          <View style={styles.expiredCard}>
            <View style={[styles.expiredIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="close" size={28} color="#DC2626" />
            </View>

            <Text style={styles.expiredTitle}>Convite Inválido</Text>
            <Text style={styles.expiredDescription}>{erroMensagem}</Text>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => onNavigate && onNavigate('Onboarding')}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ESTADO 5: CONVITE VÁLIDO */}
        {!loading && !erroStatus && convite && (
          <View style={styles.mainWhiteCard}>
            {/* CARD DO IDOSO */}
            <View style={styles.elderlySummaryRow}>
              <View style={styles.elderlyAvatarCircle}>
                <Text style={styles.elderlyAvatarInitials}>
                  {convite.nomeIdoso
                    ? convite.nomeIdoso.split(' ').map((n) => n[0]).slice(0, 2).join('')
                    : 'DM'}
                </Text>
              </View>

              <View style={styles.elderlyTexts}>
                <Text style={styles.elderlyName}>{convite.nomeIdoso}</Text>
                <Text style={styles.elderlyAge}>
                  {convite.idadeIdoso ? `${convite.idadeIdoso} anos • ` : ''}Assistido(a)
                </Text>
              </View>

              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{convite.papelLabel || 'Familiar de Apoio'}</Text>
              </View>
            </View>

            {/* QUEM CONVIDOU */}
            <View style={styles.inviterBox}>
              <Icon name="person" size={16} color="#031753" style={{ marginRight: 8 }} />
              <Text style={styles.inviterText}>
                Convite enviado por{' '}
                <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                  {convite.solicitanteNome || 'Carlos Silva'}
                </Text>{' '}
                ({convite.solicitanteGrau || 'Administrador'})
              </Text>
            </View>

            {/* BENEFÍCIOS DO ACESSO */}
            <View style={styles.accessList}>
              <Text style={styles.accessListTitle}>Permissões concedidas:</Text>
              <View style={styles.accessItem}>
                <Icon name="crisis_alert" size={16} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.accessItemText}>Recebimento de chamados de emergência SOS</Text>
              </View>
              <View style={styles.accessItem}>
                <Icon name="medication" size={16} color="#059669" style={{ marginRight: 8 }} />
                <Text style={styles.accessItemText}>Acompanhamento da rotina de medicamentos</Text>
              </View>
              <View style={styles.accessItem}>
                <Icon name="schedule" size={16} color="#2563EB" style={{ marginRight: 8 }} />
                <Text style={styles.accessItemText}>Escala e histórico de plantão familiar</Text>
              </View>
            </View>

            {/* AVISO TEMPORAL */}
            <View style={styles.temporalNotice}>
              <Icon name="schedule" size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.temporalNoticeText}>
                Válido até {convite.dataExpiracao || '48 horas'} (Uso único)
              </Text>
            </View>

            {/* FLUXO: NÃO AUTENTICADO */}
            {!isAuthenticated && (
              <View style={styles.authActionsContainer}>
                <Text style={styles.authNoticeText}>
                  Para confirmar sua entrada na rede, entre ou crie sua conta:
                </Text>

                <TouchableOpacity
                  style={styles.primaryAuthButton}
                  onPress={() => onNavigate && onNavigate('Login')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryAuthButtonText}>Entrar com Minha Conta</Text>
                  <Icon name="arrow_forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAuthButton}
                  onPress={() => onNavigate && onNavigate('Register')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryAuthButtonText}>Criar Nova Conta</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FLUXO: AUTENTICADO */}
            {isAuthenticated && (
              <View style={styles.acceptActionsContainer}>
                <TouchableOpacity
                  style={[styles.acceptCtaButton, submitting && styles.acceptCtaButtonDisabled]}
                  onPress={handleConfirmarAceite}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.acceptCtaButtonText}>Aceitar Convite e Acompanhar</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => onNavigate && onNavigate('Home')}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <Text style={styles.declineButtonText}>Agora Não</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 170,
    height: 48,
    marginBottom: 16,
  },
  badgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 10,
    gap: 6,
  },
  badgeTopText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003B26',
    letterSpacing: 0.3,
    fontFamily: typography.fontFamily.heading,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#131E3D',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: typography.fontFamily.heading,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 18,
    fontFamily: typography.fontFamily.body,
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  expiredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    shadowColor: '#B51C13',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  expiredIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFEBE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  expiredTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#B51C13',
    marginBottom: 8,
    fontFamily: typography.fontFamily.heading,
  },
  expiredDescription: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: typography.fontFamily.body,
  },
  expiredInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1EC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  expiredInfoText: {
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 16,
    flex: 1,
    fontFamily: typography.fontFamily.body,
  },
  backButton: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    fontFamily: typography.fontFamily.heading,
  },
  mainWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  elderlySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  elderlyAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  elderlyAvatarInitials: {
    fontSize: 17,
    fontWeight: '800',
    color: '#031753',
    fontFamily: typography.fontFamily.heading,
  },
  elderlyTexts: {
    flex: 1,
  },
  elderlyName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#131E3D',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  elderlyAge: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  roleTag: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003B26',
    fontFamily: typography.fontFamily.heading,
  },
  inviterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inviterText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    flex: 1,
    fontFamily: typography.fontFamily.body,
  },
  accessList: {
    marginBottom: 18,
  },
  accessListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131E3D',
    marginBottom: 8,
    fontFamily: typography.fontFamily.heading,
  },
  accessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accessItemText: {
    fontSize: 13,
    color: '#334155',
    fontFamily: typography.fontFamily.body,
  },
  temporalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  temporalNoticeText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  authActionsContainer: {
    gap: 12,
  },
  authNoticeText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: typography.fontFamily.body,
  },
  primaryAuthButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#031753',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryAuthButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
  secondaryAuthButton: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAuthButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E2E69',
    fontFamily: typography.fontFamily.heading,
  },
  acceptActionsContainer: {
    gap: 10,
  },
  acceptCtaButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  acceptCtaButtonDisabled: {
    opacity: 0.6,
  },
  acceptCtaButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
  declineButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
});
