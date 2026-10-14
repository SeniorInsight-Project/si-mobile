import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import BottomNavBar from '../components/BottomNavBar';
import { listarIdososDoFamiliar } from '../services/elderlyService';

export default function HomeScreen({ onNavigate, onSelectElderly, familiarId = 'familiar-dev' }) {
  const [idosos, setIdosos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function carregarIdosos() {
      try {
        setLoading(true);
        const data = await listarIdososDoFamiliar(familiarId);
        setIdosos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn('Erro ao carregar idosos na Home:', error.message);
      } finally {
        setLoading(false);
      }
    }

    carregarIdosos();
  }, [familiarId]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Idosos da sua família</Text>
        <Text style={styles.subtitle}>Selecione um perfil para visualizar cadastro e identidade.</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#031753" size="large" />
            <Text style={styles.loadingText}>Carregando idosos...</Text>
          </View>
        ) : (
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {idosos.map((idoso) => (
              <TouchableOpacity
                key={idoso.idosoId}
                style={styles.elderlyCard}
                onPress={() => {
                  if (onSelectElderly) onSelectElderly(idoso.idosoId);
                  onNavigate('ElderlyProfile');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.cardName}>{idoso.nome}</Text>
                <Text style={styles.cardMeta}>Nascimento: {idoso.dataNascimento || 'Não informado'}</Text>
                <Text style={styles.cardMeta}>Sexo: {idoso.sexo || 'Não informado'}</Text>
                <Text style={styles.cardMeta}>Celular: {idoso.celular || 'Não informado'}</Text>
              </TouchableOpacity>
            ))}

            {idosos.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Nenhum idoso cadastrado</Text>
                <Text style={styles.emptyText}>Acesse o perfil para cadastrar o primeiro idoso.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <BottomNavBar currentScreen="Home" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 96,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#031753',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  listContainer: {
    flex: 1,
  },
  elderlyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardMeta: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
  },
});
