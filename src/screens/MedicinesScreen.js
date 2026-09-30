import { StyleSheet, Text, View } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import BottomNavBar from '../components/BottomNavBar';

export default function MedicinesScreen({ onNavigate }) {
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Rotina de Medicamentos</Text>
        <Text style={styles.subtitle}>Gerencie os horários dos remédios aqui.</Text>
      </View>
      <BottomNavBar currentScreen="Medicines" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#031753', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748B' },
});