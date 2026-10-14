import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
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
import {
  listarIdososDoFamiliar,
  salvarCadastroIdoso,
  atualizarDadosIdoso,
  obterIdosoLocalPorId,
} from '../services/elderlyService';
import { gerarCodigoIdentidade } from '../services/identityService';

const DEFAULT_IDOSO_ID = 'e3b0c442-98fc-1c14-9afc-432100000001';

const SEXOS = ['Feminino', 'Masculino', 'Outro'];
const EMPTY_FORM = {
  nome: '',
  dataNascimento: '',
  sexo: '',
  celular: '',
};

function formatarCelular(texto) {
  const numeros = texto.replace(/\D/g, '').slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarData(texto) {
  const numeros = texto.replace(/\D/g, '').slice(0, 8);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

function parseDataBr(data) {
  const match = /^([0-3]\d)\/([0-1]\d)\/(\d{4})$/.exec(data);
  if (!match) return null;

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);
  const date = new Date(ano, mes - 1, dia);

  if (
    date.getFullYear() !== ano ||
    date.getMonth() !== mes - 1 ||
    date.getDate() !== dia ||
    date > new Date()
  ) {
    return null;
  }

  return date;
}

function calcularIdade(dataNascimento) {
  const nascimento = parseDataBr(dataNascimento);
  if (!nascimento) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());

  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

export default function ElderlyProfileScreen({
  onNavigate,
  idosoId = DEFAULT_IDOSO_ID,
  accessRole = 'ADMIN',
  familiarId = 'familiar-dev',
}) {
  const [comorbidades, setComorbidades] = useState(INITIAL_COMORBIDITIES);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Cadastro do idoso (HU-008) e identidade de acesso (HU-009)
  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editando, setEditando] = useState(true);
  const [codigoIdentidade, setCodigoIdentidade] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [gerandoCodigo, setGerandoCodigo] = useState(false);

  // Campos complementares da ficha conforme o .fig
  const [fatorSanguineo, setFatorSanguineo] = useState('O+ Positivo');
  const [medicoReferencia, setMedicoReferencia] = useState(
    'Dr. Silva - Cardiologista'
  );

  const podeEditar = accessRole !== 'OBSERVADOR';

  const idade = useMemo(() => calcularIdade(form.dataNascimento), [form.dataNascimento]);
  const avisoIdade = idade !== null && idade < 49;

  useEffect(() => {
    async function carregarPerfil() {
      try {
        setLoadingPerfil(true);
        const locais = await listarIdososDoFamiliar(familiarId);
        const idosoAtual = locais.find((item) => item.idosoId === idosoId) || obterIdosoLocalPorId(idosoId);

        if (idosoAtual) {
          setProfile(idosoAtual);
          setForm({
            nome: idosoAtual.nome || '',
            dataNascimento: idosoAtual.dataNascimento || '',
            sexo: idosoAtual.sexo || '',
            celular: idosoAtual.celular || '',
          });
          setEditando(false);
          const identidade = await gerarCodigoIdentidade(idosoAtual.idosoId);
          setCodigoIdentidade(identidade.codigo);
          setQrValue(identidade.qrValue);
        } else {
          setEditando(true);
          setProfile(null);
          setForm(EMPTY_FORM);
        }
      } catch (error) {
        console.warn('Erro ao carregar perfil do idoso:', error.message);
      } finally {
        setLoadingPerfil(false);
      }
    }

    carregarPerfil();
  }, [idosoId, familiarId]);

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

  const atualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errors[campo]) {
      setErrors((prev) => ({ ...prev, [campo]: undefined }));
    }
  };

  const validar = () => {
    const novosErros = {};

    if (!form.nome.trim()) {
      novosErros.nome = 'Informe o nome completo do idoso.';
    }

    const dataValida = parseDataBr(form.dataNascimento);
    if (!form.dataNascimento.trim()) {
      novosErros.dataNascimento = 'Informe a data de nascimento.';
    } else if (!dataValida) {
      novosErros.dataNascimento = 'Data de nascimento inválida. Use DD/MM/AAAA.';
    }

    if (!form.sexo) {
      novosErros.sexo = 'Selecione o sexo.';
    }

    const celularNumeros = form.celular.replace(/\D/g, '');
    if (!form.celular.trim()) {
      novosErros.celular = 'Informe o celular.';
    } else if (celularNumeros.length < 10 || celularNumeros.length > 11) {
      novosErros.celular = 'Celular inválido. Use DDD + número.';
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const gerarNovoCodigo = async (idosoIdAtual) => {
    try {
      setGerandoCodigo(true);
      const identidade = await gerarCodigoIdentidade(idosoIdAtual);
      setCodigoIdentidade(identidade.codigo);
      setQrValue(identidade.qrValue);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar um novo código agora.');
    } finally {
      setGerandoCodigo(false);
    }
  };

  const salvar = async () => {
    if (!validar()) return;

    try {
      setSaving(true);

      const payload = {
        nome: form.nome.trim(),
        dataNascimento: form.dataNascimento,
        sexo: form.sexo,
        celular: form.celular,
      };

      const salvo = profile?.idosoId
        ? await atualizarDadosIdoso(profile.idosoId, payload)
        : await salvarCadastroIdoso({ ...payload, idosoId });

      setProfile(salvo);
      setEditando(false);

      await gerarNovoCodigo(salvo.idosoId);

      if (avisoIdade) {
        Alert.alert(
          'Cadastro salvo com aviso',
          'A idade é menor que 49 anos. O cadastro foi salvo normalmente.'
        );
      } else {
        Alert.alert('Cadastro salvo', 'Dados do idoso atualizados com sucesso.');
      }
    } catch (error) {
      Alert.alert('Erro ao salvar', 'Não foi possível salvar os dados do idoso.');
    } finally {
      setSaving(false);
    }
  };

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

  if (loadingPerfil) {
    return (
      <ScreenWrapper>
        <AppHeader
          title="Família Perfil"
          subtitle="CUIDADO ATIVO"
          onNavigate={onNavigate}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#031753" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
        <BottomNavBar currentScreen="ElderlyProfile" onNavigate={onNavigate} />
      </ScreenWrapper>
    );
  }

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
              <View style={[styles.avatarImage, { backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="person" size={44} color="#031753" />
              </View>
            </View>
            <View style={styles.monitoredBadge}>
              <View style={styles.monitoredDot} />
              <Text style={styles.monitoredBadgeText}>Monitorada</Text>
            </View>
          </View>

          <Text style={styles.elderlyName}>{form.nome || 'Novo idoso'}</Text>
          <Text style={styles.elderlyPlanSubtitle}>
            {idade !== null ? `${idade} anos` : 'Idade não informada'} •{' '}
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

            {podeEditar && (
              <TouchableOpacity
                style={styles.addPillButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Icon name="add" size={15} color="#031753" />
                <Text style={styles.addPillText}>Adicionar</Text>
              </TouchableOpacity>
            )}
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
                    onRemove={podeEditar ? handleRemove : undefined}
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

        {/* SEÇÃO 3: FICHA CADASTRAL DO IDOSO (HU-008) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconCircleSky}>
                <Icon name="person" size={16} color="#031753" />
              </View>
              <Text style={styles.sectionTitle}>Ficha Cadastral do Idoso</Text>
            </View>

            {!editando && podeEditar && (
              <TouchableOpacity
                style={styles.addPillButton}
                onPress={() => setEditando(true)}
                activeOpacity={0.8}
              >
                <Icon name="edit" size={15} color="#031753" />
                <Text style={styles.addPillText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.roleHint}>
            Perfil atual: {accessRole === 'OBSERVADOR' ? 'Familiar de Apoio' : accessRole}
          </Text>

          {/* Campo 1: Nome Completo */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithIconRow}>
              <Icon name="person" size={15} color="#64748B" />
              <Text style={styles.fieldLabel}>Nome Completo</Text>
            </View>
            <View style={[styles.pillInputContainer, errors.nome && styles.pillInputError]}>
              <TextInput
                style={styles.pillInputText}
                value={form.nome}
                onChangeText={(texto) => atualizarCampo('nome', texto)}
                editable={editando}
                placeholder="Nome completo"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
          </View>

          {/* Linha Dupla: Nascimento e Fator Sanguíneo */}
          <View style={styles.fieldsRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.labelWithIconRow}>
                <Icon name="calendar_today" size={14} color="#64748B" />
                <Text style={styles.fieldLabel}>Nascimento</Text>
              </View>
              <View style={[styles.pillInputContainer, errors.dataNascimento && styles.pillInputError]}>
                <TextInput
                  style={styles.pillInputText}
                  value={form.dataNascimento}
                  onChangeText={(texto) => atualizarCampo('dataNascimento', formatarData(texto))}
                  editable={editando}
                  keyboardType="number-pad"
                  placeholder="DD/MM/AAAA"
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
                  editable={editando}
                  placeholderTextColor="#94A3B8"
                />
                <Icon name="expand_more" size={18} color="#64748B" />
              </View>
            </View>
          </View>
          {errors.dataNascimento && <Text style={styles.errorText}>{errors.dataNascimento}</Text>}

          {avisoIdade && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Aviso: idade menor que 49 anos. O cadastro será permitido.
              </Text>
            </View>
          )}

          {/* Campo: Sexo */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithIconRow}>
              <Icon name="person" size={15} color="#64748B" />
              <Text style={styles.fieldLabel}>Sexo</Text>
            </View>
            <View style={styles.sexRow}>
              {SEXOS.map((item) => {
                const selected = form.sexo === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.sexButton,
                      selected && styles.sexButtonSelected,
                      !editando && styles.sexButtonDisabled,
                    ]}
                    onPress={() => editando && atualizarCampo('sexo', item)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sexButtonText, selected && styles.sexButtonTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.sexo && <Text style={styles.errorText}>{errors.sexo}</Text>}
          </View>

          {/* Campo: Celular */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithIconRow}>
              <Icon name="call" size={15} color="#64748B" />
              <Text style={styles.fieldLabel}>Celular</Text>
            </View>
            <View style={[styles.pillInputContainer, errors.celular && styles.pillInputError]}>
              <TextInput
                style={styles.pillInputText}
                value={form.celular}
                onChangeText={(texto) => atualizarCampo('celular', formatarCelular(texto))}
                editable={editando}
                keyboardType="phone-pad"
                placeholder="(00) 00000-0000"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {errors.celular && <Text style={styles.errorText}>{errors.celular}</Text>}
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
                editable={editando}
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

        {/* SEÇÃO 4: IDENTIDADE DE ACESSO (HU-009) */}
        {profile?.idosoId && codigoIdentidade && qrValue ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconCircleSky}>
                <Icon name="verified_user" size={16} color="#031753" />
              </View>
              <Text style={styles.sectionTitle}>Identidade de Acesso</Text>
            </View>

            <View style={styles.comorbiditiesCard}>
              <Text style={styles.codeLabel}>Código de 6 dígitos</Text>
              <Text style={styles.codeValue}>{codigoIdentidade}</Text>

              <View style={styles.qrWrapper}>
                <QRCode value={qrValue} size={170} />
              </View>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => gerarNovoCodigo(profile.idosoId)}
                activeOpacity={0.85}
                disabled={gerandoCodigo}
              >
                <Text style={styles.secondaryButtonText}>
                  {gerandoCodigo ? 'Gerando...' : 'Gerar novo código'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

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
          {editando && podeEditar && (
            <TouchableOpacity
              style={styles.primarySaveButton}
              onPress={salvar}
              activeOpacity={0.85}
              disabled={saving}
            >
              <Icon name="check" size={20} color="#FFFFFF" />
              <Text style={styles.primarySaveButtonText}>
                {saving ? 'Salvando...' : 'Salvar Cadastro'}
              </Text>
            </TouchableOpacity>
          )}

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

  /* CADASTRO (HU-008) E IDENTIDADE DE ACESSO (HU-009) */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
  },
  roleHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: '#031753',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  errorText: {
    color: '#DC2626',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  sexRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sexButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  sexButtonDisabled: {
    backgroundColor: '#F8FAFC',
  },
  sexButtonSelected: {
    borderColor: '#031753',
    backgroundColor: '#EBF2FF',
  },
  sexButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 12,
  },
  sexButtonTextSelected: {
    color: '#031753',
  },
  codeLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#031753',
    letterSpacing: 3,
  },
  qrWrapper: {
    alignItems: 'center',
    marginVertical: 16,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#031753',
    fontWeight: '700',
  },
  pillInputError: {
    borderWidth: 1,
    borderColor: '#DC2626',
  },
});
