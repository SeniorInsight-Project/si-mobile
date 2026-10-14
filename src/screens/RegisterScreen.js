import React, { useState } from 'react';
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
import Checkbox from '../components/Checkbox';
import RoleSelector from '../components/RoleSelector';
import Icon from '../components/Icon';
import { typography } from '../theme';

export default function RegisterScreen({ onNavigate }) {
  const [aceitouTermos, setAceitouTermos] = useState(true);
  const [perfil, setPerfil] = useState('Familiar');

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
          {/* HEADER: Logo Centralizado + Título */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/logoComTexto.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Crie sua conta</Text>
            <Text style={styles.subtitle}>
              Junte-se à rede de proteção e cuidado SeniorInsight
            </Text>
          </View>

          {/* SELETOR DE PERFIL */}
          <RoleSelector selectedRole={perfil} onSelectRole={setPerfil} />

          {/* FORMULÁRIO EM PÍLULAS BRANCAS */}
          <View style={styles.formContainer}>
            <InputField
              label="Nome Completo"
              placeholder="Ex: Carlos Silva"
              icon="person"
              variant="white"
            />

            <InputField
              label="E-mail"
              placeholder="seu@email.com"
              icon="mail"
              variant="white"
              keyboardType="email-address"
            />

            <InputField
              label="Telefone / WhatsApp"
              placeholder="(11) 98765-4321"
              icon="call"
              variant="white"
              keyboardType="phone-pad"
            />

            <InputField
              label="Senha"
              rightLabel={
                <Text style={styles.strongPasswordLabel}>● Senha forte</Text>
              }
              placeholder="••••••••••••"
              defaultValue="senior123456"
              icon="lock"
              isPassword={true}
              variant="white"
              bottomElement={
                <View style={styles.strengthBarsRow}>
                  <View style={styles.strengthBarActive} />
                  <View style={styles.strengthBarActive} />
                  <View style={styles.strengthBarActive} />
                  <View style={styles.strengthBarActive} />
                </View>
              }
            />

            <InputField
              label="Confirmar Senha"
              placeholder="••••••••••••"
              defaultValue="senior123456"
              icon="lock"
              isPassword={true}
              variant="white"
              rightElement={
                <View style={styles.confirmCheckPill}>
                  <Icon name="check" size={14} color="#003B26" />
                </View>
              }
            />

            {/* CHECKBOX DE TERMOS */}
            <Checkbox
              isChecked={aceitouTermos}
              onToggle={() => setAceitouTermos(!aceitouTermos)}
            >
              <Text style={styles.termsText}>
                Concordo com os{' '}
                <Text style={styles.termsHighlight}>Termos de Uso</Text> e a{' '}
                <Text style={styles.termsHighlight}>
                  Política de Proteção de Dados (LGPD)
                </Text>{' '}
                do SeniorInsight.
              </Text>
            </Checkbox>

            {/* BOTÃO CRIAR CONTA */}
            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={() => onNavigate('ElderlyMode')}
              activeOpacity={0.85}
            >
              <Text style={styles.createAccountText}>Criar Conta</Text>
              <Icon name="arrow_forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* CARD DE SEGURANÇA MÉDICA DE PONTA A PONTA (#E8F8F0) */}
            <View style={styles.securityReassuranceCard}>
              <View style={styles.securityIconCircle}>
                <Icon name="shield_check" size={20} color="#10B981" />
              </View>
              <View style={styles.securityTextColumn}>
                <Text style={styles.securityTitle}>
                  Segurança Médica de Ponta a Ponta
                </Text>
                <Text style={styles.securitySubtitle}>
                  Criptografia hospitalar para proteção de dados vitais.
                </Text>
              </View>
            </View>

            {/* LINK PARA LOGIN */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Já possui cadastro? </Text>
              <TouchableOpacity onPress={() => onNavigate('Login')}>
                <Text style={styles.footerLink}>Entrar</Text>
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 240,
    height: 76,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
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
  formContainer: {
    marginTop: 4,
  },
  strongPasswordLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    fontFamily: typography.fontFamily.heading,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  strengthBarActive: {
    flex: 1,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#10B981',
  },
  confirmCheckPill: {
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: typography.fontFamily.body,
  },
  termsHighlight: {
    color: '#031753',
    fontWeight: '700',
  },
  createAccountButton: {
    width: '100%',
    height: 60,
    borderRadius: 32,
    backgroundColor: '#D83729',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    shadowColor: '#D83729',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  createAccountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily.heading,
  },
  securityReassuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    borderRadius: 24,
    padding: 16,
    marginTop: 22,
    gap: 12,
  },
  securityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityTextColumn: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003B26',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  securitySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#065F46',
    lineHeight: 16,
    fontFamily: typography.fontFamily.body,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: typography.fontFamily.body,
  },
  footerLink: {
    color: '#031753',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
});