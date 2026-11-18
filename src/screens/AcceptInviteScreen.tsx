import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, font, rounded, shadows, typography } from '../theme';
import {
  obterDetalhesConvite,
  aceitarConvite,
  DetalhesConvite,
} from '../services/redeProtecaoService';
import { useAutenticacaoKeycloak, type DesfechoAutenticacao } from '../services/authService';

export interface UsuarioLogado {
  token?: string;
  [key: string]: any;
}

type ErroConviteStatus = 'EXPIRADO' | 'LIMITE' | 'INVALIDO';

export interface AcceptInviteScreenProps {
  onNavigate?: (screen: string) => void;
  inviteToken?: string;
  isAuthenticated?: boolean;
  currentUser?: UsuarioLogado | null;
  /** Resultado da volta do cadastro do Keycloak ("Criar Nova Conta"). */
  onDesfecho?: (desfecho: DesfechoAutenticacao) => void;
}

export default function AcceptInviteScreen({
  onNavigate,
  inviteToken,
  isAuthenticated = false,
  currentUser = null,
  onDesfecho,
}: AcceptInviteScreenProps) {
  const cadastro = useAutenticacaoKeycloak();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [convite, setConvite] = useState<DetalhesConvite | null>(null);
  const [erroStatus, setErroStatus] = useState<ErroConviteStatus | null>(null);
  const [erroMensagem, setErroMensagem] = useState<string>('');
  const [sucesso, setSucesso] = useState<boolean>(false);

  useEffect(() => {
    async function carregarConvite(token: string) {
      try {
        setLoading(true);
        setErroStatus(null);
        setErroMensagem('');

        const dados = await obterDetalhesConvite(token);

        if (dados.expirado || dados.status === 'EXPIRADO') {
          setErroStatus('EXPIRADO');
          setErroMensagem(
            'Convite expirado. O prazo de validade temporal de 48 horas foi ultrapassado. Peça um novo convite ao familiar administrador.'
          );
        } else {
          setConvite(dados);
        }
      } catch (err: any) {
        if (err?.status === 410) {
          setErroStatus('EXPIRADO');
          setErroMensagem('Convite expirado. Peça um novo convite ao familiar administrador.');
        } else if (err?.status === 409) {
          setErroStatus('LIMITE');
          setErroMensagem(err?.message || 'Limite de 5 familiares atingido ou vínculo já existente.');
        } else {
          setErroStatus('INVALIDO');
          setErroMensagem(err?.message || 'Convite não encontrado ou inválido.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (inviteToken) {
      carregarConvite(inviteToken);
    } else {
      setConvite(null);
      setErroStatus('INVALIDO');
      setErroMensagem('O link do convite está incompleto. Abra de novo o link que você recebeu.');
      setLoading(false);
    }
  }, [inviteToken]);

  const handleConfirmarAceite = async () => {
    if (!inviteToken) return;
    try {
      setSubmitting(true);
      const aceite = await aceitarConvite(inviteToken);
      setSucesso(true);
      Alert.alert(
        'Convite Aceito!',
        `Você agora faz parte da Rede de Cuidados de ${aceite?.nomeIdoso || convite?.nomeIdoso || 'do idoso'}.`,
        [
          {
            text: 'Acessar Rede',
            onPress: () => onNavigate && onNavigate('Family'),
          },
        ]
      );
    } catch (err: any) {
      if (err?.status === 410) {
        setErroStatus('EXPIRADO');
        setErroMensagem('Convite expirado. Peça um novo convite ao familiar administrador.');
      } else if (err?.status === 409) {
        setErroStatus('LIMITE');
        setErroMensagem(err?.message || 'Você já faz parte da rede ou o limite de 5 familiares foi atingido.');
      } else {
        Alert.alert('Erro ao aceitar', err?.message || 'Não foi possível confirmar o convite.');
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
            <Icon name="favorite" size={14} color={colors.mint.textDark} />
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
            <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.loadingText}>Verificando dados do convite...</Text>
          </View>
        )}

        {/* ESTADO 2: CONVITE EXPIRADO (HU-013 Cenário 2) */}
        {!loading && erroStatus === 'EXPIRADO' && (
          <View style={styles.expiredCard}>
            <View style={styles.expiredIconCircle}>
              <Icon name="schedule" size={28} color={colors.coralDark} />
            </View>

            <Text style={styles.expiredTitle}>Convite Expirado</Text>
            <Text style={styles.expiredDescription}>{erroMensagem}</Text>

            <View style={styles.expiredInfoBox}>
              <Icon name="shield_alert" size={16} color={colors.coralDark} style={{ marginRight: 6 }} />
              <Text style={styles.expiredInfoText}>
                Por segurança LGPD e integridade da rede, links temporais expiram automaticamente.
              </Text>
            </View>

            <Button
              title="Voltar para o Início"
              onPress={() => onNavigate && onNavigate('Onboarding')}
              variant="secondary"
            />
          </View>
        )}

        {/* ESTADO 3: LIMITE DE 5 FAMILIARES OU CONFLITO */}
        {!loading && erroStatus === 'LIMITE' && (
          <View style={styles.expiredCard}>
            <View style={[styles.expiredIconCircle, { backgroundColor: colors.amber.background }]}>
              <Icon name="groups" size={28} color={colors.amber.text} />
            </View>

            <Text style={[styles.expiredTitle, { color: colors.amber.textDark }]}>Limite da Rede</Text>
            <Text style={styles.expiredDescription}>{erroMensagem}</Text>

            <Button
              title="Acessar Meu Painel"
              onPress={() => onNavigate && onNavigate('Home')}
              variant="primary"
            />
          </View>
        )}

        {/* ESTADO 4: CONVITE INVÁLIDO OU ERRO GENÉRICO */}
        {!loading && erroStatus === 'INVALIDO' && (
          <View style={styles.expiredCard}>
            <View style={[styles.expiredIconCircle, { backgroundColor: colors.peach.background }]}>
              <Icon name="close" size={28} color={colors.error} />
            </View>

            <Text style={styles.expiredTitle}>Convite Inválido</Text>
            <Text style={styles.expiredDescription}>{erroMensagem}</Text>

            <Button
              title="Voltar"
              onPress={() => onNavigate && onNavigate('Onboarding')}
              variant="secondary"
            />
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
                    ? convite.nomeIdoso.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
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
              <Icon name="person" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.inviterText}>
                {convite.solicitanteNome ? (
                  <>
                    Convite enviado por{' '}
                    <Text style={{ ...font('body', 700), color: colors.textPrimary }}>
                      {convite.solicitanteNome}
                    </Text>
                    {convite.solicitanteGrau ? ` (${convite.solicitanteGrau})` : ''}
                  </>
                ) : (
                  'Convite enviado pelo familiar administrador'
                )}
              </Text>
            </View>

            {/* BENEFÍCIOS DO ACESSO */}
            <View style={styles.accessList}>
              <Text style={styles.accessListTitle}>Permissões concedidas:</Text>
              <View style={styles.accessItem}>
                <Icon name="crisis_alert" size={16} color={colors.error} style={{ marginRight: 8 }} />
                <Text style={styles.accessItemText}>Recebimento de chamados de emergência SOS</Text>
              </View>
              <View style={styles.accessItem}>
                <Icon name="medication" size={16} color={colors.successDark} style={{ marginRight: 8 }} />
                <Text style={styles.accessItemText}>Acompanhamento da rotina de medicamentos</Text>
              </View>
              <View style={styles.accessItem}>
                <Icon name="schedule" size={16} color={colors.primaryNavy} style={{ marginRight: 8 }} />
                <Text style={styles.accessItemText}>Escala e histórico de plantão familiar</Text>
              </View>
            </View>

            {/* AVISO TEMPORAL */}
            <View style={styles.temporalNotice}>
              <Icon name="schedule" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
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

                <Button
                  title="Entrar com Minha Conta"
                  onPress={() => onNavigate && onNavigate('Login')}
                  variant="primary"
                  size="lg"
                  iconRight="arrow_forward"
                />

                <Button
                  title="Criar Nova Conta"
                  onPress={async () => {
                    const desfecho = await cadastro.criarConta();
                    onDesfecho?.(desfecho);
                  }}
                  variant="outline"
                  loading={cadastro.carregando}
                  disabled={!cadastro.pronto || cadastro.carregando}
                />
              </View>
            )}

            {/* FLUXO: AUTENTICADO */}
            {isAuthenticated && (
              <View style={styles.acceptActionsContainer}>
                <Button
                  title="Aceitar Convite e Acompanhar"
                  onPress={handleConfirmarAceite}
                  variant="primary"
                  size="lg"
                  iconLeft="check"
                  loading={submitting}
                  disabled={submitting}
                />

                <Button
                  title="Agora Não"
                  onPress={() => onNavigate && onNavigate('Home')}
                  variant="ghost"
                  disabled={submitting}
                />
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
    backgroundColor: colors.mint.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: rounded.full,
    marginBottom: 10,
    gap: 6,
  },
  badgeTopText: {
    fontSize: 14,
    color: colors.mint.textDark,
    letterSpacing: 0.3,
    ...font('heading', 800),
  },
  screenTitle: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
    ...font('body', 400),
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 32,
    alignItems: 'center',
    ...shadows.tier2,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  expiredCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.amber.border,
    ...shadows.tier2,
  },
  expiredIconCircle: {
    width: 56,
    height: 56,
    borderRadius: rounded.full,
    backgroundColor: colors.peach.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  expiredTitle: {
    fontSize: 20,
    color: colors.coralDark,
    marginBottom: 8,
    ...font('heading', 800),
  },
  expiredDescription: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    ...font('body', 400),
  },
  expiredInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.peach.background,
    borderRadius: rounded.input,
    padding: 12,
    marginBottom: 20,
  },
  expiredInfoText: {
    fontSize: 14,
    color: colors.amber.textDark,
    lineHeight: 19,
    flex: 1,
    ...font('body', 400),
  },
  mainWhiteCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 20,
    ...shadows.tier2,
  },
  elderlySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  elderlyAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: rounded.full,
    backgroundColor: colors.infoSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  elderlyAvatarInitials: {
    fontSize: 17,
    color: colors.primary,
    ...font('heading', 800),
  },
  elderlyTexts: {
    flex: 1,
  },
  elderlyName: {
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 2,
    ...font('heading', 800),
  },
  elderlyAge: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 600),
  },
  roleTag: {
    backgroundColor: colors.mint.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  roleTagText: {
    fontSize: 14,
    color: colors.mint.textDark,
    ...font('heading', 800),
  },
  inviterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvasBase,
    borderRadius: rounded.input,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviterText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    flex: 1,
    ...font('body', 400),
  },
  accessList: {
    marginBottom: 18,
  },
  accessListTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    ...font('heading', 700),
  },
  accessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accessItemText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    flex: 1,
    ...font('body', 400),
  },
  temporalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  temporalNoticeText: {
    fontSize: 14,
    color: colors.textSecondary,
    ...font('body', 400),
  },
  authActionsContainer: {
    gap: 12,
  },
  authNoticeText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 4,
    ...font('body', 400),
  },
  acceptActionsContainer: {
    gap: 10,
  },
});
