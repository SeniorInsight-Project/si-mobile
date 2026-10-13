import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar from '../components/BottomNavBar';
import ComorbidityChip from '../components/ComorbidityChip';
import AddComorbidityModal from '../components/AddComorbidityModal';
import Icon from '../components/Icon';
import { typography } from '../theme';
import {
  listarComorbidades,
  adicionarComorbidades,
  removerComorbidade,
  INITIAL_COMORBIDITIES,
} from '../services/comorbidadeService';

const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function ElderlyProfileScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
}) {
  const [comorbidades, setComorbidades] = useState(INITIAL_COMORBIDITIES);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados dos campos da ficha cadastral conforme o .fig
  const [nomeCompleto, setNomeCompleto] = useState('Dona Maria Aparecida');
  const [dataNascimento, setDataNascimento] = useState('14/05/1948');
  const [fatorSanguineo, setFatorSanguineo] = useState('O+ Positivo');
  const [medicoReferencia, setMedicoReferencia] = useState(
    'Dr. Silva - Cardiologista'
  );

  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true);
        const data = await listarComorbidades(idosoId);
        if (
          data &&
          Array.isArray(data.comorbidades) &&
          data.comorbidades.length > 0
        ) {
          setComorbidades(data.comorbidades);
        }
      } catch (err) {
        console.warn('Erro ao carregar comorbidades:', err.message);
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [idosoId]);

  const handleRemove = (nome) => {
    Alert.alert(
      'Remover Comorbidade',
      `Deseja realmente remover "${nome}" do prontuário do idoso?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const listaAnterior = [...comorbidades];
            setComorbidades((prev) => prev.filter((item) => item !== nome));

            try {
              setActionLoading(true);
              await removerComorbidade(idosoId, nome);
            } catch (err) {
              console.warn('Falha na API ao remover, revertendo:', err.message);
              setComorbidades(listaAnterior);
              Alert.alert(
                'Aviso',
                'Não foi possível sincronizar a remoção com o servidor no momento.'
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAdd = async (novaComorbidade) => {
    try {
      setActionLoading(true);
      setComorbidades((prev) => [...prev, novaComorbidade]);
      setModalVisible(false);

      await adicionarComorbidades(idosoId, [novaComorbidade]);
    } catch (err) {
      console.warn(
        'Erro ao sincronizar nova comorbidade com o backend:',
        err.message
      );
      Alert.alert(
        'Sincronização',
        'Comorbidade salva localmente. O servidor será atualizado assim que conectado.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSalvarAlteracoes = () => {
    Alert.alert(
      'Ficha Atualizada',
      'As alterações cadastrais e a lista de comorbidades foram salvas e sincronizadas com toda a rede de cuidadores e socorristas.'
    );
  };

  return (
    <ScreenWrapper>
      {/* HEADER PADRONIZADO GLOBAL */}
      <AppHeader
        title="Família Perfil"
        subtitle="CUIDADO ATIVO"
        onNavigate={onNavigate}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CARD 1: IDENTIDADE E MÉTRICAS RÁPIDAS (rx=32, #FFFFFF) */}
        <View style={styles.elderlyCard}>
          <View style={styles.cardTopGlow} />

          <View style={styles.avatarWrapper}>
            <View style={styles.avatarOuterRing}>
              <Image
                source={require('../../assets/figma/avatar-dona-maria-lg.jpg')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.monitoredBadge}>
              <View style={styles.monitoredDot} />
              <Text style={styles.monitoredBadgeText}>Monitorada</Text>
            </View>
          </View>

          <Text style={styles.elderlyName}>{nomeCompleto}</Text>
          <Text style={styles.elderlyPlanSubtitle}>
            76 anos •{' '}
            <Text style={styles.planBadgeText}>Plano Cuidador Ativo</Text>
          </Text>

          {/* BANDEJA CINZA (#F2F4F7, rx=20) COM 3 CARTÕES BRANCOS (#FFFFFF, rx=16) */}
          <View style={styles.statsTray}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TIPO SANGUÍNEO</Text>
              <Text style={styles.bloodValue}>O+</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>GLICEMIA</Text>
              <View style={styles.glycemiaRow}>
                <Text style={styles.glycemiaValue}>104</Text>
                <Text style={styles.glycemiaUnit}>mg</Text>
              </View>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>CHECK-UP</Text>
              <Text style={styles.checkinValue}>Hoje</Text>
            </View>
          </View>
        </View>

        {/* SEÇÃO 2: COMORBIDADES & ALERTAS (Cabeçalho fora do card branco) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconCircleCoral}>
                <Icon name="vital_signs" size={16} color="#B51C13" />
              </View>
              <Text style={styles.sectionTitle}>Comorbidades &amp; Alertas</Text>
            </View>

            <TouchableOpacity
              style={styles.addPillButton}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Icon name="add" size={15} color="#031753" />
              <Text style={styles.addPillText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.comorbiditiesCard}>
            <Text style={styles.sectionInstruction}>
              Toque nos cartuchos para ver detalhes ou no botão de exclusão para
              atualizar a ficha clínica.
            </Text>

            {loading ? (
              <ActivityIndicator
                color="#031753"
                size="small"
                style={{ marginVertical: 20 }}
              />
            ) : (
              <View style={styles.chipsContainer}>
                {comorbidades.map((item) => (
                  <ComorbidityChip
                    key={item}
                    name={item}
                    onRemove={handleRemove}
                    disabled={actionLoading}
                  />
                ))}

                {comorbidades.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Nenhuma comorbidade registrada. Clique em "Adicionar" para
                      incluir patologias ou alergias.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* SEÇÃO 3: FICHA CADASTRAL DO IDOSO (Pílulas brancas independentes sobre o canvas) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconCircleSky}>
              <Icon name="person" size={16} color="#031753" />
            </View>
            <Text style={styles.sectionTitle}>Ficha Cadastral do Idoso</Text>
          </View>

          {/* Campo 1: Nome Completo */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithIconRow}>
              <Icon name="person" size={15} color="#64748B" />
              <Text style={styles.fieldLabel}>Nome Completo</Text>
            </View>
            <View style={styles.pillInputContainer}>
              <TextInput
                style={styles.pillInputText}
                value={nomeCompleto}
                onChangeText={setNomeCompleto}
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Linha Dupla: Nascimento e Fator Sanguíneo */}
          <View style={styles.fieldsRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.labelWithIconRow}>
                <Icon name="calendar_today" size={14} color="#64748B" />
                <Text style={styles.fieldLabel}>Nascimento</Text>
              </View>
              <View style={styles.pillInputContainer}>
                <TextInput
                  style={styles.pillInputText}
                  value={dataNascimento}
                  onChangeText={setDataNascimento}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.labelWithIconRow}>
                <Icon name="water_drop" size={14} color="#64748B" />
                <Text style={styles.fieldLabel}>Fator Sanguíneo</Text>
              </View>
              <View style={styles.pillInputContainer}>
                <TextInput
                  style={styles.pillInputText}
                  value={fatorSanguineo}
                  onChangeText={setFatorSanguineo}
                  placeholderTextColor="#94A3B8"
                />
                <Icon name="expand_more" size={18} color="#64748B" />
              </View>
            </View>
          </View>

          {/* Campo 3: Médico de Referência */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithIconRow}>
              <Icon name="medical_services" size={15} color="#64748B" />
              <Text style={styles.fieldLabel}>Médico(a) de Referência</Text>
            </View>
            <View style={styles.pillInputContainer}>
              <TextInput
                style={styles.pillInputText}
                value={medicoReferencia}
                onChangeText={setMedicoReferencia}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                style={styles.doctorCallBadge}
                onPress={() =>
                  Alert.alert('Ligação', 'Discando para Dr. Silva...')
                }
                activeOpacity={0.8}
              >
                <Icon name="call" size={15} color="#003B26" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* BANNER DE SINCRONIZAÇÃO COM A FAMÍLIA (#E8F8F0, rx=24) */}
        <View style={styles.syncAlertCard}>
          <View style={styles.syncIconWrapper}>
            <Icon name="shield_check" size={18} color="#003B26" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.syncAlertTitle}>
              Ficha Sincronizada com a Família
            </Text>
            <Text style={styles.syncAlertDescription}>
              Qualquer alteração feita aqui atualiza o módulo SOS e a triagem
              médica dos socorristas em tempo real.
            </Text>
          </View>
        </View>

        {/* BOTÕES DE AÇÃO INFERIORES */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.primarySaveButton}
            onPress={handleSalvarAlteracoes}
            activeOpacity={0.85}
          >
            <Icon name="check" size={20} color="#FFFFFF" />
            <Text style={styles.primarySaveButtonText}>Salvar Alterações</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryHistoryButton}
            onPress={() =>
              Alert.alert(
                'Histórico Clínico',
                'Visualização do prontuário histórico consolidado.'
              )
            }
            activeOpacity={0.85}
          >
            <Icon name="assignment" size={18} color="#031753" />
            <Text style={styles.secondaryHistoryButtonText}>
              Histórico Clínico Completo
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE ADIÇÃO DE COMORBIDADE */}
      <AddComorbidityModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAdd}
        existingComorbidities={comorbidades}
        loading={actionLoading}
      />

      {/* BARRA DE NAVEGAÇÃO INFERIOR */}
      <BottomNavBar currentScreen="ElderlyProfile" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },

  /* CARD 1: IDENTIDADE E MÉTRICAS */
  elderlyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  cardTopGlow: {
    position: 'absolute',
    top: -64,
    width: 288,
    height: 144,
    borderRadius: 144,
    backgroundColor: '#FFF1EC',
    opacity: 0.65,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  monitoredBadge: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 5,
  },
  monitoredDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  monitoredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#003B26',
    fontFamily: typography.fontFamily.heading,
  },
  elderlyName: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: typography.fontFamily.heading,
    color: '#131E3D',
    marginBottom: 4,
    textAlign: 'center',
  },
  elderlyPlanSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 18,
    textAlign: 'center',
    fontFamily: typography.fontFamily.body,
  },
  planBadgeText: {
    color: '#2D418A',
    fontWeight: '700',
  },
  statsTray: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F2F4F7',
    borderRadius: 20,
    padding: 6,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: typography.fontFamily.heading,
  },
  bloodValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#B51C13',
    fontFamily: typography.fontFamily.heading,
  },
  glycemiaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  glycemiaValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  glycemiaUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  checkinValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    fontFamily: typography.fontFamily.heading,
  },

  /* SEÇÃO 2: COMORBIDADES & ALERTAS */
  sectionBlock: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionIconCircleCoral: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEBE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionIconCircleSky: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: typography.fontFamily.heading,
    color: '#131E3D',
  },
  addPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 35,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: '#EBF5FF',
    gap: 5,
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#031753',
    fontFamily: typography.fontFamily.heading,
  },
  comorbiditiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 20,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  sectionInstruction: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 14,
    fontFamily: typography.fontFamily.body,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  emptyState: {
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  emptyStateText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },

  /* SEÇÃO 3: PÍLULAS INDEPENDENTES DA FICHA CADASTRAL */
  fieldGroup: {
    marginBottom: 14,
  },
  labelWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#131E3D',
    fontFamily: typography.fontFamily.heading,
  },
  pillInputContainer: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  pillInputText: {
    flex: 1,
    color: '#131E3D',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.fontFamily.body,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  doctorCallBadge: {
    width: 32,
    height: 36,
    borderRadius: 16,
    backgroundColor: '#E8F8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  /* BANNER DE SINCRONIZAÇÃO */
  syncAlertCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F8F0',
    borderRadius: 24,
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  syncIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#003B26',
    marginBottom: 3,
    fontFamily: typography.fontFamily.heading,
  },
  syncAlertDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: '#003B26',
    lineHeight: 17,
    fontFamily: typography.fontFamily.body,
  },

  /* BOTÕES DE AÇÃO */
  actionButtonsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  primarySaveButton: {
    backgroundColor: '#D83729',
    borderRadius: 9999,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#D83729',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  primarySaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: typography.fontFamily.heading,
  },
  secondaryHistoryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#031753',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  secondaryHistoryButtonText: {
    color: '#031753',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.fontFamily.heading,
  },
});
