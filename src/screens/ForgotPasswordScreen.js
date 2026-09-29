import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';

export default function ForgotPasswordScreen({ onNavigate }) {
  // Estado para controlar se o e-mail já foi enviado (alterna entre o formulário e a tela de sucesso)
  const [emailEnviado, setEmailEnviado] = useState(false);
  
  // Estado para a contagem regressiva do reenvio (começa em 45 segundos, igual ao Figma)
  const [tempoRestante, setTempoRestante] = useState(45);
  const [podeReenviar, setPodeReenviar] = useState(false);

  // Efeito para rodar a contagem regressiva quando a tela de sucesso estiver ativa
  useEffect(() => {
    let timer;
    if (emailEnviado && tempoRestante > 0) {
      timer = setInterval(() => {
        setTempoRestante((prev) => prev - 1);
      }, 1000);
    } else if (tempoRestante === 0) {
      setPodeReenviar(true);
    }
    return () => clearInterval(timer);
  }, [emailEnviado, tempoRestante]);

  const handleReenviar = () => {
    setTempoRestante(45);
    setPodeReenviar(false);
    // Aqui você chamaria a API de reenvio novamente
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          {/* HEADER: Botão de Voltar e Logo menor sem texto */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => onNavigate('Login')} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>←</Text>
            </TouchableOpacity>
            
            <Image 
              source={require('../../assets/logo.png')} // O logo.png sem texto que está na pasta assets
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={{ width: 40 }} />
          </View>

          {/* TÍTULO E SUBTÍTULO */}
          <Text style={styles.title}>Recuperar Senha</Text>
          <Text style={styles.subtitle}>
            Informe seu e-mail cadastrado para enviarmos as instruções de redefinição seguras.
          </Text>

          {/* ESTADO 1: FORMULÁRIO DE ENVIO */}
          {!emailEnviado ? (
            <View style={styles.formContainer}>
              <InputField 
                label="E-mail cadastrado" 
                placeholder="exemplo@seniorinsight.com.br" 
                icon="✉️" 
              />

              <View style={styles.buttonWrapper}>
                <PrimaryButton 
                  title="Recuperar Senha  →" 
                  onPress={() => setEmailEnviado(true)} // Simula o envio bem-sucedido
                />
              </View>
            </View>
          ) : (
            /* ESTADO 2: SUCESSO E CONTAGEM REGRESSIVA (FIEL AO FIGMA) */
            <View style={styles.successContainer}>
              
              {/* Alerta Verde do Figma */}
              <View style={styles.successAlert}>
                <View style={styles.successIconCircle}>
                  <Text style={styles.successCheck}>✓</Text>
                </View>
                <View style={styles.successTextWrapper}>
                  <Text style={styles.successTitle}>Verifique sua caixa de entrada!</Text>
                  <Text style={styles.successDescription}>
                    Enviamos um link de recuperação para seu e-mail cadastrado.
                  </Text>
                </View>
              </View>

              {/* Campo de e-mail informativo (apenas leitura ou preenchido) */}
              <InputField 
                label="E-mail cadastrado" 
                placeholder="exemplo@seniorinsight.com.br" 
                icon="✉️" 
              />

              {/* Botão de reenviar com contagem regressiva dinâmica */}
              <View style={styles.resendArea}>
                <Text style={styles.resendText}>
                  Não recebeu o e-mail?{' '}
                  {podeReenviar ? (
                    <TouchableOpacity onPress={handleReenviar}>
                      <Text style={styles.resendLink}>Reenviar agora</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.timerText}>Reenviar em {tempoRestante}s</Text>
                  )}
                </Text>
              </View>

            </View>
          )}

          {/* RODAPÉ: Voltar ao Login */}
          <TouchableOpacity style={styles.footerBack} onPress={() => onNavigate('Login')}>
            <Text style={styles.footerBackText}>← Voltar ao Login</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconButtonText: {
    fontSize: 18,
    color: '#1E2E69',
  },
  logo: {
    width: 36,
    height: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1E2E69',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  buttonWrapper: {
    marginTop: 10,
  },
  // ESTILOS DO ALERTA DE SUCESSO (VERDE)
  successContainer: {
    width: '100%',
  },
  successAlert: {
    flexDirection: 'row',
    backgroundColor: '#E6F4EA', // Verde clarinho do Figma
    borderWidth: 1,
    borderColor: '#CEEAD6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#137333', // Verde escuro
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  successCheck: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  successTextWrapper: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#137333',
    marginBottom: 2,
  },
  successDescription: {
    fontSize: 12,
    color: '#137333',
    lineHeight: 16,
  },
  resendArea: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  resendText: {
    fontSize: 13,
    color: '#64748B',
  },
  timerText: {
    fontWeight: 'bold',
    color: '#1E2E69',
  },
  resendLink: {
    fontWeight: 'bold',
    color: '#E5534B',
  },
  footerBack: {
    marginTop: 10,
    alignItems: 'center',
  },
  footerBackText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});