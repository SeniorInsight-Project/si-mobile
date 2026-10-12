import { useEffect, useMemo, useState } from 'react';
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
import BottomNavBar from '../components/BottomNavBar';
import {
  listarIdososDoFamiliar,
  salvarCadastroIdoso,
  atualizarDadosIdoso,
  obterIdosoLocalPorId,
} from '../services/elderlyService';
import { gerarCodigoIdentidade } from '../services/identityService';

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
  idosoId,
  accessRole = 'ADMIN',
  familiarId = 'familiar-dev',
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [editando, setEditando] = useState(true);
  const [codigoIdentidade, setCodigoIdentidade] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [gerandoCodigo, setGerandoCodigo] = useState(false);

  const podeEditar = accessRole !== 'OBSERVADOR';

  const idade = useMemo(() => calcularIdade(form.dataNascimento), [form.dataNascimento]);
  const avisoIdade = idade !== null && idade < 49;

  useEffect(() => {
    async function carregarPerfil() {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    }

    carregarPerfil();
  }, [idosoId, familiarId]);

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

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#031753" />
          <Text style={styles.loadingText}>Carregando perfil...</Text>
        </View>
        <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil do Idoso</Text>
          {!editando && podeEditar && (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditando(true)} activeOpacity={0.8}>
              <Text style={styles.editButtonText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.roleHint}>
          Perfil atual: {accessRole === 'OBSERVADOR' ? 'Familiar de Apoio' : accessRole}
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cadastro do idoso</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={[styles.input, errors.nome && styles.inputError, !editando && styles.inputDisabled]}
            value={form.nome}
            onChangeText={(texto) => atualizarCampo('nome', texto)}
            editable={editando}
            placeholder="Nome completo"
          />
          {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}

          <Text style={styles.label}>Data de nascimento</Text>
          <TextInput
            style={[styles.input, errors.dataNascimento && styles.inputError, !editando && styles.inputDisabled]}
            value={form.dataNascimento}
            onChangeText={(texto) => atualizarCampo('dataNascimento', formatarData(texto))}
            editable={editando}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
          />
          {errors.dataNascimento && <Text style={styles.errorText}>{errors.dataNascimento}</Text>}

          {avisoIdade && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Aviso: idade menor que 49 anos. O cadastro será permitido.
              </Text>
            </View>
          )}

          <Text style={styles.label}>Sexo</Text>
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

          <Text style={styles.label}>Celular</Text>
          <TextInput
            style={[styles.input, errors.celular && styles.inputError, !editando && styles.inputDisabled]}
            value={form.celular}
            onChangeText={(texto) => atualizarCampo('celular', formatarCelular(texto))}
            editable={editando}
            keyboardType="phone-pad"
            placeholder="(00) 00000-0000"
          />
          {errors.celular && <Text style={styles.errorText}>{errors.celular}</Text>}

          {editando && podeEditar && (
            <TouchableOpacity style={styles.saveButton} onPress={salvar} activeOpacity={0.85} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Salvando...' : 'Salvar cadastro'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {profile?.idosoId && codigoIdentidade && qrValue ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Identidade de acesso</Text>
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
        ) : null}
      </ScrollView>

      <BottomNavBar currentScreen="Family" onNavigate={onNavigate} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#031753',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
  },
  inputError: {
    borderColor: '#DC2626',
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
  saveButton: {
    marginTop: 16,
    backgroundColor: '#DC2626',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
});
