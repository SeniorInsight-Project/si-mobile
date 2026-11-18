import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors, font, rounded, shadows, typography } from '../theme';
import {
  abrirRedefinicaoSenha,
  useAutenticacaoKeycloak,
  type DesfechoAutenticacao,
} from '../services/authService';

export interface LoginScreenProps {
  /** Resultado da volta do Keycloak (sessão salva, e-mail a confirmar...). */
  onDesfecho: (desfecho: DesfechoAutenticacao) => void;
  /** Aviso vindo do App (ex.: o servidor recusou a sessão logo após o login). */
  aviso?: string | null;
}

export default function LoginScreen({ onDesfecho, aviso }: LoginScreenProps) {
  const { pronto, carregando, erro, entrar, entrarComGoogle, criarConta } = useAutenticacaoKeycloak();

  const handleEntrar = async () => {
    onDesfecho(await entrar());
  };

  const handleCriarConta = async () => {
    onDesfecho(await criarConta());
  };

  return (
    <ScreenWrapper hasHeader={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* APRESENTAÇÃO DA MARCA */}
          <View style={styles.brandContainer}>
            <Image
              source={require('../../assets/logoComTexto.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.safeBadge}>
              <Icon name="favorite" size={16} color={colors.mint.textDark} />
              <Text style={styles.safeBadgeText}>AMBIENTE SEGURO</Text>
            </View>

            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>
              Cuidando com carinho e precisão de quem você ama.
            </Text>
          </View>

          {/* CARD BRANCO EXTRUDADO PRINCIPAL */}
          {/* O formulário de e-mail e senha é o tema do Keycloak; aqui só abrimos o login. */}
          <View style={styles.mainWhiteCard}>
            <Button
              title="Entrar"
              onPress={handleEntrar}
              variant="primary"
              size="lg"
              iconRight="arrow_forward"
              loading={carregando || !pronto}
              disabled={!pronto || carregando}
            />

            <Button
              title="Entrar com Google"
              onPress={handleEntrarComGoogle}
              variant="outline"
              size="lg"
              iconLeft="login"
              disabled={!pronto || carregando}
              style={styles.googleButton}
              testID="login-google"
            />

            {erro || aviso ? <Text style={styles.errorText}>{erro || aviso}</Text> : null}

            <View style={styles.forgotWrapper}>
              <Button
                title="Esqueceu a senha?"
                onPress={() => {
                  abrirRedefinicaoSenha().catch((err) =>
                    console.warn('[LoginScreen] Falha ao abrir a redefinição de senha:', err?.message),
                  );
                }}
                variant="ghost"
                fullWidth={false}
              />
            </View>
          </View>

          {/* BADGE DE SEGURANÇA FORA DO CARD */}
          <View style={styles.securityBadgeWrapper}>
            <View style={styles.securityCard}>
              <Icon name="shield_check" size={16} color={colors.primaryNavy} />
              <Text style={styles.securityCardText}>
                Dados protegidos por criptografia de grau médico
              </Text>
            </View>
          </View>

          {/* RODAPÉ EM DUAS LINHAS */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Novo no SeniorInsight?</Text>
            <Button
              title="Criar conta de cuidador"
              onPress={handleCriarConta}
              variant="ghost"
              fullWidth={false}
              disabled={!pronto || carregando}
              testID="login-criar-conta"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 240,
    height: 82,
    marginBottom: 8,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint.background,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    marginBottom: 14,
    gap: 6,
  },
  safeBadgeText: {
    fontSize: 14,
    color: colors.mint.textDark,
    letterSpacing: 0.5,
    ...font('heading', 700),
  },
  title: {
    ...typography.headlineLg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
    paddingHorizontal: 12,
    ...font('body', 500),
  },
  mainWhiteCard: {
    backgroundColor: colors.surface,
    borderRadius: rounded.card,
    padding: 24,
    ...shadows.tier2,
  },
  forgotWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    ...font('body', 600),
  },
  securityBadgeWrapper: {
    alignItems: 'center',
    marginTop: 22,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoSurface,
    borderRadius: rounded.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  securityCardText: {
    fontSize: 14,
    color: colors.primaryNavy,
    ...font('heading', 600),
  },
  footer: {
    alignItems: 'center',
    marginTop: 22,
    gap: 4,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 15,
    ...font('body', 500),
  },
});
