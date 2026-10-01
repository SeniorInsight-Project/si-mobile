import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import InputField from '../components/InputField';
import PrimaryButton from '../components/PrimaryButton';
import SocialButton from '../components/SocialButton';
import { ArrowLeft } from 'lucide-react-native';

export default function LoginScreen({ onNavigate }) {
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
          
          {/* HEADER: Botão de Voltar e Logo */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => onNavigate('Onboarding')} style={styles.iconButton}>
              <ArrowLeft size={18} color="#031753" />
            </TouchableOpacity>
            
            <Image 
              source={require('../../assets/logoComTexto.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.title}>Acesse sua conta</Text>
          <Text style={styles.subtitle}>Que bom ter você de volta no SeniorInsight!</Text>

          <View style={styles.formContainer}>
            
            {/* BOTÃO DO GOOGLE */}
            <SocialButton 
              title="Continuar com o Google" 
              onSuccess={() => onNavigate('ElderlyMode')} 
            />

            {/* DIVISOR */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou entre com seu e-mail</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* CAMPOS MANUAIS */}
            <InputField label="E-mail" placeholder="seu@email.com" icon="mail" />
            <InputField label="Senha" placeholder="Sua senha" icon="lock" isPassword={true} />

            {/* ESQUECI MINHA SENHA */}
            <TouchableOpacity style={styles.forgotPasswordContainer} onPress={() => onNavigate      ('ForgotPassword')}>
            <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
</TouchableOpacity>

            {/* BOTÃO FINAL */}
            <View style={styles.buttonWrapper}>
              <PrimaryButton 
                title="Entrar  →" 
                onPress={() => onNavigate('ElderlyMode')} // <-- Mudou aqui para liberar o acesso!
              />
            </View>
            
            {/* LINK PARA CADASTRO */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Ainda não tem uma conta? </Text>
              <TouchableOpacity onPress={() => onNavigate('Register')}>
                <Text style={styles.footerLink}>Cadastre-se</Text>
              </TouchableOpacity>
            </View>

          </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32, // Um pouco mais de espaço aqui no login
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
    width: 140,
    height: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E2E69',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  formContainer: {
    marginTop: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: -8, // Puxa o texto um pouco mais perto do input de senha
  },
  forgotPasswordText: {
    color: '#1E2E69',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonWrapper: {
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  footerLink: {
    color: '#1E2E69',
    fontSize: 14,
    fontWeight: 'bold',
  }
});