import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import InputField from '../components/InputField';
import Checkbox from '../components/Checkbox';
import RoleSelector from '../components/RoleSelector';
import PrimaryButton from '../components/PrimaryButton';
import SocialButton from '../components/SocialButton';
import { ArrowLeft } from 'lucide-react-native';

export default function RegisterScreen({ onNavigate }) {
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [perfil, setPerfil] = useState('');

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

            {/* Essa View vazia centraliza a logo perfeitamente */}
            <View style={{ width: 40 }} />
          </View>

          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Junte-se à rede de proteção e cuidado SeniorInsight</Text>

          {/* SELETOR DE PERFIL */}
          <RoleSelector 
            selectedRole={perfil} 
            onSelectRole={setPerfil} 
          />

          {/* Formulário */}
          <View style={styles.formContainer}>
            
            {/* BOTÃO DO GOOGLE */}
            <SocialButton 
              title="Continuar com o Google" 
              onSuccess={() => onNavigate('ElderlyMode')} 
            />

            {/* DIVISOR (A linha do "ou") */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou cadastre-se com seu e-mail</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* CAMPOS MANUAIS */}
            <InputField label="Nome Completo" placeholder="Ex: Carlos Silva" icon="user" />
            <InputField label="E-mail" placeholder="seu@email.com" icon="mail" />
            <InputField label="Senha" placeholder="Mínimo 8 caracteres" icon="lock" isPassword={true} />
            <InputField label="Confirmar Senha" placeholder="Repita sua senha" icon="lock" isPassword={true} />

            {/* CHECKBOX DE TERMOS */}
            <Checkbox 
              isChecked={aceitouTermos} 
              onToggle={() => setAceitouTermos(!aceitouTermos)}
            >
              <Text style={styles.termsText}>
                Concordo com os <Text style={styles.termsHighlight}>Termos de Uso</Text> e a{' '}
                <Text style={styles.termsHighlight}>Política de Proteção de Dados (LGPD)</Text> do SeniorInsight.
              </Text>
            </Checkbox>

            {/* BOTÃO FINAL DO FORMULÁRIO */}
            <View style={styles.buttonWrapper}>
              <PrimaryButton 
                title="Criar Conta  →" 
                onPress={() => onNavigate('ElderlyMode')} // <-- Mudou aqui para liberar o acesso!
              />
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
  // ESTILOS DO DIVISOR
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
  // ESTILOS DE TERMOS
  termsText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  termsHighlight: {
    color: '#1E2E69',
    fontWeight: 'bold',
  },
  buttonWrapper: {
    marginTop: 10,
  }
});