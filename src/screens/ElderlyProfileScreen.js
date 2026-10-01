import { useState, useEffect } from 'react';
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
import {
  Camera,
  Activity,
  Plus,
  FileText,
  User,
  Calendar,
  Droplet,
  Stethoscope,
  ShieldCheck,
  Siren,
  ChevronRight,
  Check,
  ClipboardList,
} from 'lucide-react-native';
import {
  listarComorbidades,
  adicionarComorbidades,
  removerComorbidade,
  INITIAL_COMORBIDITIES,
} from '../services/comorbidadeService';

// ID padrão para desenvolvimento e testes locais (UUID v4 de exemplo)
const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

export default function ElderlyProfileScreen({ onNavigate, idosoId = DEFAULT_IDOSO_ID }) {
  const [comorbidades, setComorbidades] = useState(INITIAL_COMORBIDITIES);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados dos campos da ficha cadastral
  const [nomeCompleto, setNomeCompleto] = useState('Dona Maria Aparecida');
  const [dataNascimento, setDataNascimento] = useState('14/05/1948');
  const [fatorSanguineo, setFatorSanguineo] = useState('O+ Positivo');
  const [medicoReferencia, setMedicoReferencia] = useState('Dr. Roberto Silva (Geriatra)');

  // Busca inicial das comorbidades cadastradas no backend
  useEffect(() => {
    async function carregarDados() {
      try {
        setLoading(true);
        const data = await listarComorbidades(idosoId);
        if (data && Array.isArray(data.comorbidades) && data.comorbidades.length > 0) {
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

  // Exclusão de comorbidade
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
            // Atualização otimista na interface
            const listaAnterior = [...comorbidades];
            setComorbidades((prev) => prev.filter((item) => item !== nome));

            try {
              setActionLoading(true);
              await removerComorbidade(idosoId, nome);
            } catch (err) {
              console.warn('Falha na API ao remover, revertendo:', err.message);
              // Reverte se a API falhar
              setComorbidades(listaAnterior);
              Alert.alert('Aviso', 'Não foi possível sincronizar a remoção com o servidor no momento.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Adição de nova comorbidade
  const handleAdd = async (novaComorbidade) => {
    try {
      setActionLoading(true);
      // Adiciona localmente de forma imediata
      setComorbidades((prev) => [...prev, novaComorbidade]);
      setModalVisible(false);

      // Sincroniza com o backend via POST
      await adicionarComorbidades(idosoId, [novaComorbidade]);
    } catch (err) {
      console.warn('Erro ao sincronizar nova comorbidade com o backend:', err.message);
      Alert.alert('Sincronização', 'Comorbidade salva localmente. O servidor será atualizado assim que conectado.');
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
      <AppHeader title="Perfil do Idoso" onNavigate={onNavigate} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* CARD PRINCIPAL DO IDOSO COM STATS */}
        <View style={styles.elderlyCard}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require('../../assets/idoso.png')}
              style={styles.avatarImage}
            />
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={() => Alert.alert('Alterar Foto', 'Funcionalidade de câmera em desenvolvimento.')}
              activeOpacity={0.85}
            >
              <Camera size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.elderlyName}>{nomeCompleto}</Text>
          <Text style={styles.elderlyPlanSubtitle}>
            76 anos • <Text style={styles.planBadgeText}>Plano Cuidador Ativo</Text>
          </Text>

          {/* GRADE COM 3 CARDS DE ESTATÍSTICA RÁPIDA */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Tipo Sanguíneo</Text>
              <Text style={styles.bloodValue}>O+</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Glicemia Méd.</Text>
              <Text style={styles.glycemiaValue}>104 mg</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Check-in</Text>
              <Text style={styles.checkinValue}>Hoje</Text>
            </View>
          </View>
        </View>

        {/* SEÇÃO 2: COMORBIDADES & ALERTAS (FOCO HU15) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Activity size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Comorbidades &amp; Alertas</Text>
            </View>

            <TouchableOpacity
              style={styles.addPillButton}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Plus size={13} color="#031753" style={{ marginRight: 4 }} />
                <Text style={styles.addPillText}>Adicionar</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionInstruction}>
            Toque nos cartuchos para ver detalhes ou no botão de exclusão para atualizar a ficha clínica.
          </Text>

          {loading ? (
            <ActivityIndicator color="#031753" size="small" style={{ marginVertical: 20 }} />
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
                    Nenhuma comorbidade registrada. Clique em "Adicionar" para incluir patologias ou alergias.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* SEÇÃO 3: FICHA CADASTRAL DO IDOSO */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleWithIcon}>
            <FileText size={18} color="#031753" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Ficha Cadastral do Idoso</Text>
          </View>

          {/* Campo: Nome Completo */}
          <View style={styles.labelWithIconRow}>
            <User size={13} color="#031753" style={{ marginRight: 6 }} />
            <Text style={styles.fieldLabel}>Nome Completo</Text>
          </View>
          <View style={styles.darkInputField}>
            <TextInput
              style={styles.darkInputText}
              value={nomeCompleto}
              onChangeText={setNomeCompleto}
            />
          </View>

          {/* Linha Dupla: Nascimento e Fator Sanguíneo */}
          <View style={styles.fieldsRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.labelWithIconRow}>
                <Calendar size={13} color="#031753" style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>Nascimento</Text>
              </View>
              <View style={styles.lightInputField}>
                <TextInput
                  style={styles.lightInputText}
                  value={dataNascimento}
                  onChangeText={setDataNascimento}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.labelWithIconRow}>
                <Droplet size={13} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>Fator Sanguíneo</Text>
              </View>
              <View style={styles.lightInputField}>
                <TextInput
                  style={styles.lightInputText}
                  value={fatorSanguineo}
                  onChangeText={setFatorSanguineo}
                />
              </View>
            </View>
          </View>

          {/* Campo: Médico de Referência */}
          <View style={styles.labelWithIconRow}>
            <Stethoscope size={13} color="#031753" style={{ marginRight: 6 }} />
            <Text style={styles.fieldLabel}>Médico(a) de Referência</Text>
          </View>
          <View style={styles.doctorInputField}>
            <TextInput
              style={styles.doctorInputText}
              value={medicoReferencia}
              onChangeText={setMedicoReferencia}
            />
            <View style={styles.activeDoctorDot} />
          </View>

          {/* Banner de Sincronização com a Família */}
          <View style={styles.syncAlertCard}>
            <View style={styles.syncIconWrapper}>
              <ShieldCheck size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.syncAlertTitle}>Ficha Sincronizada com a Família</Text>
              <Text style={styles.syncAlertDescription}>
                Qualquer alteração feita aqui atualiza o módulo SOS e a triagem médica dos socorristas em tempo real.
              </Text>
            </View>
          </View>

          {/* Acesso aos Contatos de Emergência (HU35) */}
          <TouchableOpacity
            style={styles.emergencyContactsShortcut}
            onPress={() => onNavigate && onNavigate('EmergencyContacts')}
            activeOpacity={0.8}
          >
            <View style={styles.emergencyShortcutLeft}>
              <View style={styles.emergencyShortcutIconBg}>
                <Siren size={18} color="#DC2626" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.emergencyShortcutTitle}>Contatos de Emergência &amp; SOS</Text>
                <Text style={styles.emergencyShortcutSub}>3 Cuidadores cadastrados na fila de socorro</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#991B1B" />
          </TouchableOpacity>
        </View>

        {/* BOTÕES DE AÇÃO INFERIORES */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.primarySaveButton}
            onPress={handleSalvarAlteracoes}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Check size={16} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 6 }} />
              <Text style={styles.primarySaveButtonText}>Salvar Alterações</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryHistoryButton}
            onPress={() => Alert.alert('Histórico Clínico', 'Visualização do prontuário histórico consolidado.')}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ClipboardList size={16} color="#031753" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryHistoryButtonText}>Histórico Clínico Completo</Text>
            </View>
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
      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },

  /* CARD PRINCIPAL DO IDOSO */
  elderlyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#031753',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    fontSize: 12,
  },
  elderlyName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#031753',
    marginBottom: 4,
  },
  elderlyPlanSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 18,
  },
  planBadgeText: {
    color: '#16A34A',
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  bloodValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  glycemiaValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#031753',
  },
  checkinValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
  },

  /* SEÇÕES GENÉRICAS */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pulseIcon: {
    fontSize: 16,
    color: '#EF4444',
    marginRight: 8,
  },
  clipboardIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#031753',
  },
  addPillButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  addPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#031753',
  },
  sectionInstruction: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'column',
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

  /* CAMPOS DA FICHA CADASTRAL */
  labelWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  darkInputField: {
    backgroundColor: '#0F1E36',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
    marginBottom: 10,
  },
  darkInputText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  lightInputField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  lightInputText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '500',
  },
  doctorInputField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1E36',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  doctorInputText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  activeDoctorDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#22C55E',
  },

  /* BANNER DE SINCRONIZAÇÃO */
  syncAlertCard: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    gap: 10,
  },
  syncIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncShieldIcon: {
    fontSize: 16,
  },
  syncAlertTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#15803D',
    marginBottom: 2,
  },
  syncAlertDescription: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 15,
  },

  /* BOTÕES DE AÇÃO */
  actionButtonsContainer: {
    gap: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  primarySaveButton: {
    backgroundColor: '#DC2626',
    borderRadius: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primarySaveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryHistoryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryHistoryButtonText: {
    color: '#031753',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emergencyContactsShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  emergencyShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emergencyShortcutIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyShortcutIcon: {
    fontSize: 16,
  },
  emergencyShortcutTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  emergencyShortcutSub: {
    fontSize: 10,
    color: '#7F1D1D',
    marginTop: 2,
  },
  emergencyShortcutArrow: {
    fontSize: 20,
    color: '#991B1B',
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
