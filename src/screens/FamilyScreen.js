import { StyleSheet, Text, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import BottomNavBar from '../components/BottomNavBar';

export default function FamilyScreen({ onNavigate }) {
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Rede Familiar de Apoio</Text>
        <Text style={styles.subtitle}>Cuidadores e familiares conectados.</Text>
      </View>
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#031753', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B' },
});