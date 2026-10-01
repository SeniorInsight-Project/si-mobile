import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import ScreenWrapper from '../components/ScreenWrapper';
import { Pill, Siren, Users } from 'lucide-react-native';

export default function OnboardingScreen({ onNavigate }) {
  return (
    <ScreenWrapper>
      
      {/* BLOCO 1: TOPO */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
          <Text style={styles.badgeDot}>● </Text>
           Cuidado & Conexão Familiar</Text>
        </View>

        <Image
          source={require('../../assets/logoComTexto.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* BLOCO 2: CARD DA ILUSTRAÇÃO + INDICADORES */}
      <View style={styles.illustrationContainer}>
        <View style={styles.imageCard}>
          <Image
            source={require('../../assets/onbor_img.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Bolinhas do carrossel */}
        <View style={styles.pagination}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      {/* BLOCO 3: TÍTULO, SUBTÍTULO E PÍLULAS DE BENEFÍCIOS */}
      <View style={styles.contentContainer}>
        <Text style={styles.title}>
          Cuidando de quem você ama,{' '}
          <Text style={styles.titleHighlight}>juntos.</Text>
        </Text>

        <Text style={styles.subtitle}>
          Acompanhe medicamentos, sinais vitais e emergências em tempo real com toda a família conectada.
        </Text>

        <View style={styles.pillsRow}>
          <View style={styles.featurePill}>
            <Pill size={13} color="#031753" style={{ marginRight: 5 }} />
            <Text style={styles.featurePillText}>Remédios no horário</Text>
          </View>
          <View style={styles.featurePill}>
            <Siren size={13} color="#DC2626" style={{ marginRight: 5 }} />
            <Text style={styles.featurePillText}>SOS em 1 toque</Text>
          </View>
          <View style={styles.featurePill}>
            <Users size={13} color="#031753" style={{ marginRight: 5 }} />
            <Text style={styles.featurePillText}>Família conectada</Text>
          </View>
        </View>
      </View>

      {/* BLOCO 4: BOTÃO COMEÇAR E LINK DE ENTRAR */}
      <View style={styles.footer}>
        
        {/* Nosso novo componente de Botão! */}
        <PrimaryButton 
          title="Começar Agora  →" 
          onPress={() => onNavigate('Register')} 
        />

        {/* Link de Login que estava faltando */}
        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Já tem uma conta? </Text>
          <TouchableOpacity onPress={() => onNavigate('Login')}>
            <Text style={styles.loginLink}>Entrar</Text>
          </TouchableOpacity>
        </View>

      </View>

    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  badge: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    elevation: 2, shadowColor: '#000', 
    shadowOpacity: 0.05, shadowRadius: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeDot: {
    color: '#10B981',
  },
  logoImage: {
    width: 358,
    height: 92,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  illustration: {
    width: 290,
    height: 270,
    borderRadius: 20,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 32,
    backgroundColor: '#1E2E69',
  },
  contentContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E2E69',
    textAlign: 'center',
    lineHeight: 28,
  },
  titleHighlight: {
    color: '#E5534B',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  loginPrompt: {
    fontSize: 13,
    color: '#64748B',
  },
  loginLink: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E2E69',
  },
});