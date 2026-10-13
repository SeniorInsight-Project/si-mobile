import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import InputField from '../components/InputField';
import SocialButton from '../components/SocialButton';
import Icon from '../components/Icon';
import { typography } from '../theme';

export default function LoginScreen({ onNavigate }) {
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
              <Icon name="favorite" size={14} color="#003B26" />
              <Text style={styles.safeBadgeText}>AMBIENTE SEGURO</Text>
            </View>

            <Text style={styles.title}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>
              Cuidando com carinho e precisão de quem você ama.
            </Text>
          </View>

          {/* CARD BRANCO EXTRUDADO PRINCIPAL (rx=32) */}
          <View style={styles.mainWhiteCard}>
            <InputField
              label="E-mail ou Telefone"
              placeholder="exemplo@cuidador.com"
              icon="mail"
              variant="grey"
            />

            <InputField
              label="Senha"
              rightLabel={
                <TouchableOpacity onPress={() => onNavigate('ForgotPassword')}>
                  <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
                </TouchableOpacity>
              }
              placeholder="Sua senha"
              icon="lock"
              isPassword={true}
              variant="grey"
            />

            {/* BOTÃO ENTRAR */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => onNavigate('TwoFactorAuth')}
              activeOpacity={0.85}
            >
              <Text style={styles.loginButtonText}>Entrar</Text>
              <Icon name="arrow_forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* DIVISOR */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou acesse com</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* BOTÕES SOCIAIS EMPILHADOS (Apple + Google) */}
            <View style={styles.socialStack}>
              <TouchableOpacity
                style={styles.appleButton}
                onPress={() => onNavigate('TwoFactorAuth')}
                activeOpacity={0.8}
              >
                <Icon name="smartphone" size={18} color="#131E3D" />
                <Text style={styles.socialButtonText}>Continuar com Apple</Text>
              </TouchableOpacity>

              <SocialButton
                title="Continuar com Google"
                onSuccess={() => onNavigate('TwoFactorAuth')}
              />
            </View>
          </View>

          {/* BADGE DE SEGURANÇA FORA DO CARD */}
          <View style={styles.securityBadgeWrapper}>
            <View style={styles.securityCard}>
              <Icon name="shield_check" size={15} color="#2D418A" />
              <Text style={styles.securityCardText}>
                Dados protegidos por criptografia de grau médico
              </Text>
            </View>
          </View>

          {/* RODAPÉ EM DUAS LINHAS */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Novo no SeniorInsight?</Text>
            <TouchableOpacity onPress={() => onNavigate('Register')}>
              <Text style={styles.footerLink}>Criar conta de cuidador</Text>
            </TouchableOpacity>
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
    backgroundColor: '#E8F8F0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 9999,
    marginBottom: 14,
    gap: 6,
  },
  safeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003B26',
    letterSpacing: 0.5,
    fontFamily: typography.fontFamily.heading,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#131E3D',
    textAlign: 'center',
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
    paddingHorizontal: 12,
    fontFamily: typography.fontFamily.body,
  },
  mainWhiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 5,
  },
  forgotPasswordText: {
    color: '#D83729',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
  loginButton: {
    width: '100%',
    height: 56,
    borderRadius: 9999,
    backgroundColor: '#D83729',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    shadowColor: '#D83729',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 14,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: typography.fontFamily.body,
  },
  socialStack: {
    gap: 12,
  },
  appleButton: {
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  securityBadgeWrapper: {
    alignItems: 'center',
    marginTop: 22,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  securityCardText: {
    fontSize: 12,
    color: '#2D418A',
    fontWeight: '600',
    fontFamily: typography.fontFamily.heading,
  },
  footer: {
    alignItems: 'center',
    marginTop: 22,
    gap: 4,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: typography.fontFamily.body,
  },
  footerLink: {
    color: '#1E2E69',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
});