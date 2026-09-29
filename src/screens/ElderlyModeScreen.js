import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import BottomNavBar from '../components/BottomNavBar';

export default function ElderlyModeScreen({ onNavigate }) {
  return (
    <ScreenWrapper>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* HEADER SUPERIOR */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.topIconButton}>
            <Text style={styles.heartIcon}>♡</Text>
          </TouchableOpacity>

          <View style={styles.topTitleContainer}>
            <Text style={styles.topSubtitle}>CUIDADO ATIVO</Text>
            <Text style={styles.topMainTitle}>Modo Idoso Alarme Sos</Text>
          </View>

          <View style={styles.topRightIcons}>
            <TouchableOpacity style={styles.notificationButton}>
              <Text style={styles.bellIcon}>🔔</Text>
              <View style={styles.redDotNotification} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.profileHeaderButton} onPress={() => onNavigate('Login')}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logoHeaderImg} 
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* CARTÃO DE SAUDAÇÃO IDÊNTICO AO FIGMA (88px de altura, radius 32) */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingLeft}>
            <View style={styles.avatarWrapper}>
              <Image source={require('../../assets/idoso.png')} style={styles.avatarImage} />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.greetingTexts}>
              <Text style={styles.greetingSub}>Quinta-feira, 10:02</Text>
              <Text style={styles.greetingTitle}>Olá, Dona Maria!</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.audioButton} onPress={() => alert('Reproduzindo áudio...')}>
            <Text style={styles.audioIcon}>🔊</Text>
          </TouchableOpacity>
        </View>

        {/* CARD 1: HORA DO REMÉDIO (EXATAMENTE IGUAL AO FIGMA) */}
        <View style={styles.medicineCard}>
          <View style={styles.medicineHeader}>
            <View style={styles.medicineTag}>
              <Text style={styles.medicineTagText}>⏰ HORA DO REMÉDIO • 10:00</Text>
            </View>
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Hoje</Text>
            </View>
          </View>

          <View style={styles.medicineBody}>
            <View style={{ flex: 1 }}>
              <Text style={styles.medicineName}>Losartana</Text>
              <Text style={styles.medicineName}>Potássica</Text>
              <Text style={styles.medicineDosage}>50 mg • 1 comprimido</Text>
            </View>

            {/* Ícone lateral do remédio com o ponto amarelo */}
            <View style={styles.medicineImageContainer}>
              <View style={styles.yellowCornerDot} />
              <Text style={styles.pillBoxEmoji}>💊</Text>
            </View>
          </View>

          {/* Balão de instrução (Tomar com 1 copo de água) */}
          <View style={styles.instructionBubble}>
            <Text style={styles.dropIcon}>💧</Text>
            <Text style={styles.instructionText}>Tomar com 1 copo de água</Text>
          </View>

          {/* BOTÃO JÁ TOMEI */}
          <TouchableOpacity 
            style={styles.takenButton} 
            onPress={() => alert('Remédio confirmado!')}
            activeOpacity={0.85}
          >
            <View style={styles.checkmarkCircle}>
              <Text style={styles.checkSymbol}>✓</Text>
            </View>
            <Text style={styles.takenButtonText}>JÁ TOMEI</Text>
          </TouchableOpacity>
        </View>

        {/* CARD 2: PRÓXIMO HORÁRIO */}
        <View style={styles.nextCard}>
          <View style={styles.nextCardLeft}>
            <View style={styles.clockIconBg}>
              <Text style={styles.clockEmoji}>⏰</Text>
            </View>
            <View>
              <Text style={styles.nextSubLabel}>Próximo horário hoje</Text>
              <Text style={styles.nextMainLabel}>14:00 — Omeprazol 20mg</Text>
            </View>
          </View>
          <Text style={styles.arrowIcon}>›</Text>
        </View>

        {/* CARD 3: SOS EMERGÊNCIA */}
        <View style={styles.sosCard}>
          <View style={styles.sosBannerTag}>
            <Text style={styles.sosBannerText}>✱ AJUDA DE EMERGÊNCIA</Text>
          </View>
          <Text style={styles.sosWarningSubtitle}>Precisa de socorro urgente?</Text>

          {/* BOTÃO SOS COM A IMAGEM botaosos.png */}
          <TouchableOpacity 
            style={styles.sosButtonContainer} 
            onPress={() => alert('EMERGÊNCIA ACIONADA!')}
            activeOpacity={0.85}
          >
            <Image 
              source={require('../../assets/botaosos.png')} 
              style={styles.sosImageButton} 
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* INSTRUÇÃO COM O ÍCONE iconprees.png AO LADO DO TEXTO VERMELHO */}
          <View style={styles.sosInstructionRow}>
            <Image 
              source={require('../../assets/iconprees.png')} 
              style={styles.pressIconImg} 
              resizeMode="contain"
            />
            <Text style={styles.sosFooterInstruction}>Pressione e segure por 3 segundos</Text>
          </View>
          
          <Text style={styles.sosFooterSub}>
            Avisará imediatamente 3 cuidadores familiares e{'\n'}compartilhará sua localização com o SAMU (192).
          </Text>

          <View style={styles.caregiversRow}>
            <View style={styles.caregiversAvatars}>
              <View style={[styles.miniAvatar, {backgroundColor: '#EBF5FF'}]}><Text style={styles.avatarTxt}>CA</Text></View>
              <View style={[styles.miniAvatar, {backgroundColor: '#E6F4EA', marginLeft: -8}]}><Text style={[styles.avatarTxt, {color: '#137333'}]}>RO</Text></View>
              <View style={[styles.miniAvatar, {backgroundColor: '#F3E8FF', marginLeft: -8}]}><Text style={[styles.avatarTxt, {color: '#6B21A8'}]}>DR</Text></View>
            </View>
            <Text style={styles.caregiversText}>Carlos, Roberta e Dr. Silva avisados</Text>
          </View>

        </View>

      </ScrollView>

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <BottomNavBar currentScreen="ElderlyMode" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 90,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heartIcon: {
    fontSize: 18,
    color: '#1E2E69',
  },
  topTitleContainer: {
    alignItems: 'center',
  },
  topSubtitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  topMainTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E2E69',
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 14,
  },
  redDotNotification: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
  },
  profileHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  logoHeaderImg: {
    width: 22,
    height: 22,
  },
  greetingCard: {
    width: '100%',
    height: 88, // Altura exata do Figma
    backgroundColor: '#FFFFFF',
    borderRadius: 32, // Arredondamento exato do Figma
    paddingHorizontal: 16, // Padding lateral exato
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981', // Verde oficial do Figma
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greetingTexts: {
    marginLeft: 12,
  },
  greetingSub: {
    fontSize: 11,
    color: '#64748B', // Cor de texto secundário do Figma
    marginBottom: 2,
    fontWeight: '500',
  },
  greetingTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#131E3D', // Azul escuro marinho oficial do Figma
  },
  audioButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F8F0', // Fundo verde claro exato do Figma
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioIcon: {
    fontSize: 20,
    color: '#10B981', // Ícone verde
  },
 medicineCard: {
    width: '100%',
    backgroundColor: '#EBF5FF', // Azul pastel suave exato do Figma
    borderRadius: 48, // Arredondamento grande idêntico ao Figma
    padding: 24, // Padding interno exato de 24px
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicineTag: {
    backgroundColor: '#031753', // Azul escuro oficial do Figma
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  medicineTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  todayBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  medicineBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#031753', // Azul marinho forte do título
    lineHeight: 28,
  },
  medicineDosage: {
    fontSize: 14,
    color: '#1A285A',
    fontWeight: '600',
    marginTop: 6,
  },
  medicineImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 1,
  },
  yellowCornerDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#F59E0B', // Amarelo de alerta do Figma
  },
  pillBoxEmoji: {
    fontSize: 32,
  },
  instructionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#1A285A',
    fontWeight: '600',
  },
  takenButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981', // Verde esmeralda vivo do Figma
    borderRadius: 28,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  checkmarkCircle: {
    backgroundColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkSymbol: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: 'bold',
  },
  takenButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  nextCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nextCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clockEmoji: {
    fontSize: 16,
  },
  nextSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  nextMainLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#031753',
  },
  arrowIcon: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  sosCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7D7',
  },
  sosBannerTag: {
    backgroundColor: '#FFE3E3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  sosBannerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#C53030',
  },
  sosWarningSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 12,
    textAlign: 'center',
  },
  sosButtonContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sosImageButton: {
    width: '100%',
    height: '100%',
  },
  // Estilos atualizados para alinhar o iconprees.png ao lado do texto vermelho
  sosInstructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pressIconImg: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  sosFooterInstruction: {
    fontSize: 13,
    color: '#B51C13', // Vermelho vivo
    fontWeight: 'bold',
  },
  sosFooterSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  caregiversRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  caregiversAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarTxt: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1E2E69',
  },
  caregiversText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  bottomTabNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  tabItemActive: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#031753',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
  },
  tabEmojiActive: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabelActive: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});