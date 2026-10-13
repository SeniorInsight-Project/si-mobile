import React, { useState, useEffect } from 'react';
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
import Icon from '../components/Icon';
import { typography } from '../theme';

export default function ForgotPasswordScreen({ onNavigate }) {
  const [tempoRestante, setTempoRestante] = useState(45);
  const [podeReenviar, setPodeReenviar] = useState(false);

  useEffect(() => {
    let timer;
    if (tempoRestante > 0) {
      timer = setInterval(() => {
        setTempoRestante((prev) => prev - 1);
      }, 1000);
    } else {
      setPodeReenviar(true);
    }
    return () => clearInterval(timer);
  }, [tempoRestante]);

  const handleReenviar = () => {
    setTempoRestante(45);
    setPodeReenviar(false);
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
          {/* TOPO: Pílula Ambiente Seguro à direita (sem botão voltar) */}
          <View style={styles.topRow}>
            <View style={styles.safeBadge}>
              <Icon name="shield_check" size={14} color="#2D418A" />
              <Text style={styles.safeBadgeText}>Ambiente Seguro</Text>
            </View>
          </View>

          {/* ÍCONE CENTRALIZADO EM DUPLO CÍRCULO + TÍTULO */}
          <View style={styles.heroCenter}>
            <View style={styles.outerBrandCircle}>
              <View style={styles.innerBrandCircle}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={styles.brandIconImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={styles.title}>Recuperar Senha</Text>
            <Text style={styles.subtitle}>
              Informe seu e-mail cadastrado para enviarmos as instruções de
              redefinição seguras.
            </Text>
          </View>

          {/* CARD DE FEEDBACK VERDE MENTA (#E8F8F0, rx=24) */}
          <View style={styles.successAlert}>
            <View style={styles.successIconCircle}>
              <Icon name="check_circle" size={20} color="#059669" />
            </View>
            <View style={styles.successTextWrapper}>
              <Text style={styles.successTitle}>
                Verifique sua caixa de entrada!
              </Text>
              <Text style={styles.successDescription}>
                Enviamos um link de recuperação para seu e-mail cadastrado.
              </Text>
            </View>
          </View>

          {/* CAMPO E-MAIL CADASTRADO + BOTÃO ENVIAR LINK */}
          <View style={styles.formContainer}>
            <InputField
              label="E-mail cadastrado"
              placeholder="exemplo@seniorinsight.com.br"
              icon="mail"
              variant="white"
              keyboardType="email-address"
            />

            <TouchableOpacity
              style={styles.sendLinkButton}
              onPress={handleReenviar}
              activeOpacity={0.85}
            >
              <Text style={styles.sendLinkText}>Enviar Link de Recuperação</Text>
              <Icon name="arrow_forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* PÍLULA BRANCA FLUTUANTE DE REENVIO */}
          <View style={styles.resendPillWrapper}>
            <View style={styles.resendPill}>
              <Icon name="schedule" size={15} color="#64748B" />
              <Text style={styles.resendText}>Não recebeu o e-mail? </Text>
              {podeReenviar ? (
                <TouchableOpacity onPress={handleReenviar}>
                  <Text style={styles.resendLink}>Reenviar agora</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>
                  Reenviar em {tempoRestante}s
                </Text>
              )}
            </View>
          </View>

          {/* RODAPÉ: Voltar ao Login */}
          <TouchableOpacity
            style={styles.footerBack}
            onPress={() => onNavigate('Login')}
          >
            <Text style={styles.footerBackText}>Voltar ao Login</Text>
          </TouchableOpacity>
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
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 18,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    gap: 6,
  },
  safeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D418A',
    fontFamily: typography.fontFamily.heading,
  },
  heroCenter: {
    alignItems: 'center',
    marginBottom: 24,
  },
  outerBrandCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFF1EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerBrandCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  brandIconImage: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#131E3D',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
    fontFamily: typography.fontFamily.body,
  },
  successAlert: {
    flexDirection: 'row',
    backgroundColor: '#E8F8F0',
    borderRadius: 24,
    padding: 20,
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 14,
  },
  successIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTextWrapper: {
    flex: 1,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#003B26',
    marginBottom: 4,
    fontFamily: typography.fontFamily.heading,
  },
  successDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#065F46',
    lineHeight: 18,
    fontFamily: typography.fontFamily.body,
  },
  formContainer: {
    width: '100%',
  },
  sendLinkButton: {
    width: '100%',
    height: 60,
    borderRadius: 9999,
    backgroundColor: '#031753',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  sendLinkText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
  resendPillWrapper: {
    alignItems: 'center',
    marginTop: 22,
  },
  resendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 9999,
    gap: 6,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: typography.fontFamily.body,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#031753',
    fontFamily: typography.fontFamily.heading,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D83729',
    fontFamily: typography.fontFamily.heading,
  },
  footerBack: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerBackText: {
    color: '#031753',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
});