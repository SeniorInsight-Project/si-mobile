import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ScreenWrapper from '../components/ScreenWrapper';
import AppHeader from '../components/AppHeader';
import BottomNavBar, { useEspacoBarraInferior } from '../components/BottomNavBar';
import ComorbidityChip from '../components/ComorbidityChip';
import AddComorbidityModal from '../components/AddComorbidityModal';
import Icon from '../components/Icon';
import SemIdosoCard from '../components/SemIdosoCard';
import Button from '../components/Button';
import TextField from '../components/TextField';
import ChoiceChip from '../components/ChoiceChip';
import { colors, font, rounded, shadows, typography } from '../theme';
import {
  listarComorbidades,
  adicionarComorbidades,
  removerComorbidade,
  podeEditarComorbidades,
  ehCondicaoDoSemaforo,
  AVISO_OUTRAS_COMORBIDADES,
} from '../services/comorbidadeService';
import { obterIdoso, atualizarIdoso } from '../services/elderlyService';
import {
  SEXOS_IDOSO,
  TIPOS_SANGUINEOS,
  calcularIdade,
  formatarData,
  isoParaDataBr,
  parseDataBr,
} from '../services/cadastroIdosoValidacao';
import { extrairMensagemErro } from '../services/erroHelper';
import type { IdosoApi } from '../types/api';
import CodigoPareamentoPainel from '../components/CodigoPareamentoPainel';
import { useIdoso } from '../context/IdosoContext';
import { usePapel } from '../context/PapelContext';

interface ElderlyFormState {
  nome: string;
  dataNascimento: string;
  sexo: string;
  tipoSanguineo: string;
}

type ElderlyFormErrors = Partial<Record<keyof ElderlyFormState, string>>;

const EMPTY_FORM: ElderlyFormState = {
  nome: '',
  dataNascimento: '',
  sexo: '',
  tipoSanguineo: '',
};

/** Cadastro da API (data ISO) -> formulário (DD/MM/AAAA). */
function formularioDoIdoso(idoso: IdosoApi): ElderlyFormState {
  return {
    nome: idoso.nomeCompleto || '',
    dataNascimento: isoParaDataBr(idoso.dataNascimento) ?? '',
    sexo: idoso.genero || '',
    tipoSanguineo: idoso.tipoSanguineo || '',
  };
}

export interface ElderlyProfileScreenProps {
  onNavigate?: (screen: string) => void;
  idosoId?: string | null;
  accessRole?: string;
}

export default function ElderlyProfileScreen({
  onNavigate,
  idosoId: idosoIdProp,
  accessRole = 'ADMIN',
}: ElderlyProfileScreenProps) {
  const espacoInferior = useEspacoBarraInferior();
  // O idoso vem do contexto; a prop `idosoId` serve só de override (testes).
  const { idosoId: idosoIdContexto } = useIdoso();
  const idosoId = idosoIdProp ?? idosoIdContexto;
  const [comorbidades, setComorbidades] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // Cadastro do idoso (HU-008) e identidade de acesso (HU-009)
  const [loadingPerfil, setLoadingPerfil] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [profile, setProfile] = useState<IdosoApi | null>(null);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const [tentativaPerfil, setTentativaPerfil] = useState<number>(0);
  const [form, setForm] = useState<ElderlyFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<ElderlyFormErrors>({});
  // Só edita depois que o cadastro veio da API: sem ele não há base para o PUT completo.
  const [editando, setEditando] = useState<boolean>(false);
  // Código de pareamento (HU-008): gerado pelo identity-service logo depois de cadastrar um idoso novo ou
  // quando o familiar pede. Abrir o perfil não gera código: cada geração invalida o anterior no servidor.
  const gerarCodigoAoAbrir = false; // o código nasce no RegisterElderly

  const papelApp = usePapel();
  const podeEditar = papelApp !== 'IDOSO' && podeEditarComorbidades(accessRole);

  const idade = useMemo(() => calcularIdade(form.dataNascimento), [form.dataNascimento]);
  const avisoIdade = idade !== null && idade < 49;

  // Cadastro completo do idoso do contexto: GET /api/v1/idosos/{id}.
  useEffect(() => {
    const idAtivo = idosoId;
    setProfile(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setEditando(false);
    setErroPerfil(null);
    if (!idAtivo) {
      setLoadingPerfil(false);
      return;
    }

    let ativo = true;
    async function carregarPerfil(id: string) {
      try {
        setLoadingPerfil(true);
        const idoso = await obterIdoso(id);
        if (!ativo) return;
        setProfile(idoso);
        setForm(formularioDoIdoso(idoso));
      } catch (error: any) {
        if (!ativo) return;
        console.warn('Erro ao carregar perfil do idoso:', error?.message);
        setErroPerfil(
          extrairMensagemErro(error, 'Não foi possível carregar o perfil agora. Tente de novo mais tarde.')
        );
      } finally {
        if (ativo) setLoadingPerfil(false);
      }
    }

    carregarPerfil(idAtivo);
    return () => {
      ativo = false;
    };
  }, [idosoId, tentativaPerfil]);

  useEffect(() => {
    const idAtivo = idosoId;
    if (!idAtivo) {
      setComorbidades([]);
      setLoading(false);
      return;
    }

    async function carregarDados(id: string) {
      try {
        setLoading(true);
        const data = await listarComorbidades(id);
        if (data && Array.isArray(data)) {
          setComorbidades(data);
        }
      } catch (err: any) {
        console.warn('Erro ao carregar comorbidades:', err?.message);
        Alert.alert('Comorbidades', 'Não foi possível carregar as comorbidades agora. Tente de novo mais tarde.');
      } finally {
        setLoading(false);
      }
    }

    carregarDados(idAtivo);
  }, [idosoId]);

  const atualizarCampo = (campo: keyof ElderlyFormState, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errors[campo]) {
      setErrors((prev) => ({ ...prev, [campo]: undefined }));
    }
  };

  const validar = (): boolean => {
    const novosErros: ElderlyFormErrors = {};

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

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const cancelarEdicao = () => {
    if (profile) setForm(formularioDoIdoso(profile));
    setErrors({});
    setEditando(false);
  };

  const salvar = async () => {
    if (!profile) {
      Alert.alert('Erro ao salvar', 'O cadastro do idoso não foi carregado. Tente abrir o perfil de novo.');
      return;
    }
    if (!validar()) return;

    try {
      setSaving(true);
      // PUT completo: parte do cadastro que veio da API e troca só os campos editados.
      const salvo = await atualizarIdoso(profile, {
        nome: form.nome,
        dataNascimento: form.dataNascimento,
        sexo: form.sexo,
        tipoSanguineo: form.tipoSanguineo || null,
      });

      setProfile(salvo);
      setForm(formularioDoIdoso(salvo));
      setEditando(false);

      if (avisoIdade) {
        Alert.alert(
          'Cadastro salvo com aviso',
          'A idade é menor que 49 anos. O cadastro foi salvo normalmente.'
        );
      } else {
        Alert.alert('Cadastro salvo', 'Dados do idoso atualizados com sucesso.');
      }
    } catch (error) {
      console.warn('Erro ao salvar perfil do idoso:', (error as Error)?.message);
      Alert.alert(
        'Erro ao salvar',
        extrairMensagemErro(error, 'Não foi possível salvar os dados do idoso. Tente de novo.')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (nome: string) => {
    if (!idosoId) return;
    const idAtivo = idosoId;
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
              await removerComorbidade(idAtivo, nome);
            } catch (err: any) {
              console.warn('Falha na API ao remover, revertendo:', err?.message);
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

  const handleAdd = async (novaComorbidade: string) => {
    if (!idosoId) return;
    const listaAnterior = [...comorbidades];
    try {
      setActionLoading(true);
      setComorbidades((prev) => [...prev, novaComorbidade]);
      setModalVisible(false);

      const atualizada = await adicionarComorbidades(idosoId, [novaComorbidade]);
      if (Array.isArray(atualizada?.comorbidades)) setComorbidades(atualizada.comorbidades);
    } catch (err: any) {
      console.warn(
        'Erro ao salvar nova comorbidade no backend:',
        err?.message
      );
      setComorbidades(listaAnterior);
      Alert.alert('Comorbidades', 'Não foi possível salvar a comorbidade. Tente de novo.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loadingPerfil) {
    return (
      <ScreenWrapper>
        <AppHeader
          title="Perfil do idoso"
          onNavigate={onNavigate}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
        title="Perfil do idoso"
        onNavigate={onNavigate}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: espacoInferior }]}
      >
        {!idosoId ? (
          <SemIdosoCard onNavigate={onNavigate} />
        ) : (
          <>
            {/* CARD 1: IDENTIDADE E MÉTRICAS RÁPIDAS (rx=32, #FFFFFF) */}
        <View style={styles.elderlyCard}>
          <View style={styles.cardTopGlow} />

          <View style={styles.avatarWrapper}>
            <View style={styles.avatarOuterRing}>
              <View style={[styles.avatarImage, { backgroundColor: colors.infoSurface, justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="person" size={44} color={colors.primary} />
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
              <Text style={styles.bloodValue}>{profile?.tipoSanguineo || '—'}</Text>
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

{/* AVISO DE AUTORIZAÇÕES E CURATELA (HU-018 Cenário 2) */}
        <View style={styles.curatelaNoticeCard} testID="aviso-curatela-perfil">
          <Icon name="shield" size={18} color={colors.primary} />
          <Text style={styles.curatelaNoticeText}>
            Somente o idoso pode autorizar o uso dos próprios dados. Familiares sem curatela registrada não podem alterar autorizações de saúde (RN-001 / Art. 11 LGPD).
          </Text>
        </View>

        {/* SEÇÃO 2: COMORBIDADES & ALERTAS (Cabeçalho fora do card branco) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconCircleCoral}>
                <Icon name="vital_signs" size={16} color={colors.coralDark} />
              </View>
              <Text style={styles.sectionTitle}>Comorbidades &amp; Alertas</Text>
            </View>

            {podeEditar && (
              <Button
                title="Adicionar"
                iconLeft="add"
                variant="secondary"
                size="md"
                fullWidth={false}
                onPress={() => setModalVisible(true)}
              />
            )}
          </View>

          <View style={styles.comorbiditiesCard}>
            {!podeEditar && (
              <View style={{ backgroundColor: colors.surfaceSubtle, borderRadius: rounded.input, padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, ...font('body', 600) }}>
                  Modo somente leitura (Familiar de Apoio)
                </Text>
              </View>
            )}
            <Text style={styles.sectionInstruction}>
              {podeEditar
                ? 'Condições da lista clínica entram no cálculo do semáforo. Use o botão de exclusão para atualizar a ficha.'
                : 'Visualização da ficha clínica do idoso.'}
            </Text>

            {loading ? (
              <ActivityIndicator
                color={colors.primary}
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

                {comorbidades.some((item) => !ehCondicaoDoSemaforo(item)) && (
                  <Text style={{ fontSize: 14, color: colors.amber.text, marginTop: 8, ...font('body', 600) }}>
                    * Condições em "Outras": {AVISO_OUTRAS_COMORBIDADES.toLowerCase()}.
                  </Text>
                )}

                {comorbidades.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Nenhuma comorbidade registrada.
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
                <Icon name="person" size={16} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Ficha Cadastral do Idoso</Text>
            </View>

            {!editando && podeEditar && profile && (
              <Button
                title="Editar"
                iconLeft="edit"
                variant="secondary"
                size="md"
                fullWidth={false}
                onPress={() => setEditando(true)}
              />
            )}
          </View>

          {!profile ? (
            <View style={styles.perfilIndisponivelCard} testID="perfil-indisponivel">
              <Icon name="warning" size={22} color={colors.coralDark} />
              <Text style={styles.perfilIndisponivelTexto}>
                {erroPerfil || 'O cadastro do idoso não está disponível agora.'}
              </Text>
              <Button
                title="Tentar novamente"
                iconLeft="refresh"
                variant="secondary"
                fullWidth={false}
                onPress={() => setTentativaPerfil((n) => n + 1)}
              />
            </View>
          ) : (
            <>
          <Text style={styles.roleHint}>
            Perfil atual: {accessRole === 'OBSERVADOR' ? 'Familiar de Apoio' : accessRole}
          </Text>

          {/* Campo 1: Nome Completo */}
          <TextField
            label="Nome Completo"
            icon="person"
            value={form.nome}
            onChangeText={(texto) => atualizarCampo('nome', texto)}
            editable={editando}
            placeholder="Nome completo"
            error={errors.nome || undefined}
          />

          {/* Campo 2: Nascimento (DD/MM/AAAA; vai em ISO para a API) */}
          <TextField
            label="Nascimento"
            icon="calendar_today"
            value={form.dataNascimento}
            onChangeText={(texto) => atualizarCampo('dataNascimento', formatarData(texto))}
            editable={editando}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            error={errors.dataNascimento || undefined}
          />

          {avisoIdade && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Aviso: idade menor que 49 anos. O cadastro será permitido.
              </Text>
            </View>
          )}

          {/* Campo: Sexo (mesmas opções do cadastro) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Sexo</Text>
            <View style={styles.sexRow}>
              {SEXOS_IDOSO.map((item) => (
                <ChoiceChip
                  key={item}
                  label={item}
                  selected={form.sexo === item}
                  disabled={!editando}
                  onPress={() => editando && atualizarCampo('sexo', item)}
                />
              ))}
            </View>
            {errors.sexo && <Text style={styles.errorText}>{errors.sexo}</Text>}
          </View>

          {/* Campo: Tipo sanguíneo (tipoSanguineo no contrato). Tocar de novo desmarca. */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tipo sanguíneo</Text>
            <View style={styles.sexRow}>
              {(TIPOS_SANGUINEOS.includes(form.tipoSanguineo) || !form.tipoSanguineo
                ? TIPOS_SANGUINEOS
                : [...TIPOS_SANGUINEOS, form.tipoSanguineo]
              ).map((item) => (
                <ChoiceChip
                  key={item}
                  label={item}
                  selected={form.tipoSanguineo === item}
                  disabled={!editando}
                  onPress={() =>
                    editando && atualizarCampo('tipoSanguineo', form.tipoSanguineo === item ? '' : item)
                  }
                />
              ))}
            </View>
            {!editando && !form.tipoSanguineo ? (
              <Text style={styles.roleHint}>Não informado</Text>
            ) : null}
          </View>
            </>
          )}
        </View>

        {/* SEÇÃO 4: CÓDIGO DE PAREAMENTO (HU-008), gerado pelo identity-service */}
        {profile?.id && podeEditar ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconCircleSky}>
                <Icon name="verified_user" size={16} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Código de pareamento</Text>
            </View>

            <CodigoPareamentoPainel
              key={profile.id}
              idosoId={profile.id}
              nomeIdoso={profile.nomeCompleto || form.nome}
              gerarAoAbrir={gerarCodigoAoAbrir}
            />
          </View>
        ) : null}

        {/* BANNER DE SINCRONIZAÇÃO COM A FAMÍLIA (#E8F8F0, rx=24) */}
        <View style={styles.syncAlertCard}>
          <View style={styles.syncIconWrapper}>
            <Icon name="shield_check" size={18} color={colors.mint.textDark} />
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
          {editando && podeEditar && profile && (
            <>
              <Button
                title={saving ? 'Salvando...' : 'Salvar Cadastro'}
                iconLeft="check"
                variant="primary"
                size="lg"
                loading={saving}
                disabled={saving}
                onPress={salvar}
              />
              <Button
                title="Cancelar edição"
                iconLeft="close"
                variant="ghost"
                size="lg"
                disabled={saving}
                onPress={cancelarEdicao}
              />
            </>
          )}

        </View>
          </>
        )}
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
  perfilIndisponivelCard: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.peach.border,
    backgroundColor: colors.peach.background,
  },
  perfilIndisponivelTexto: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.coralDark,
    ...font('body', 600),
  },
  curatelaNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.sky.background,
    borderWidth: 1,
    borderColor: colors.skyBorder,
    borderRadius: rounded.lg,
    padding: 14,
    marginBottom: 16,
  },
  curatelaNoticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    color: colors.primary,
    ...font('body', 400),
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* CARD 1: IDENTIDADE E MÉTRICAS */
  elderlyCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.tier2,
  },
  cardTopGlow: {
    position: 'absolute',
    top: -64,
    width: 288,
    height: 144,
    borderRadius: rounded.full,
    backgroundColor: colors.peach.background,
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
    borderRadius: rounded.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.white,
    overflow: 'hidden',
    ...shadows.tier2,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: rounded.full,
  },
  monitoredBadge: {
    position: 'absolute',
    bottom: -6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.mint.background,
    borderWidth: 2,
    borderColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: rounded.full,
    gap: 5,
  },
  monitoredDot: {
    width: 6,
    height: 6,
    borderRadius: rounded.sm,
    backgroundColor: colors.successDark,
  },
  monitoredBadgeText: {
    fontSize: 14,
    color: colors.mint.textDark,
    ...font('heading', 800),
  },
  elderlyName: {
    fontSize: 22,
    ...font('heading', 800),
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  elderlyPlanSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 18,
    textAlign: 'center',
    ...font('body', 600),
  },
  planBadgeText: {
    color: colors.primaryNavy,
    ...font('body', 700),
  },
  statsTray: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: rounded.xl,
    padding: 6,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: rounded.lg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    // Rótulos de 14 px podem quebrar em 2 linhas ("TIPO SANGUÍNEO"): o valor fica na base para alinhar entre os blocos.
    justifyContent: 'space-between',
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    ...font('heading', 700),
  },
  bloodValue: {
    fontSize: 16,
    color: colors.coralDark,
    ...font('heading', 800),
  },
  glycemiaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  glycemiaValue: {
    fontSize: 16,
    color: colors.textPrimary,
    ...font('heading', 800),
  },
  glycemiaUnit: {
    fontSize: 14,
    ...font('body', 700),
    color: colors.textSecondary,
  },
  checkinValue: {
    fontSize: 15,
    color: colors.successDark,
    ...font('heading', 800),
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
    borderRadius: rounded.input,
    backgroundColor: colors.peach.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionIconCircleSky: {
    width: 28,
    height: 28,
    borderRadius: rounded.input,
    backgroundColor: colors.infoSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    ...font('heading', 800),
    color: colors.textPrimary,
  },
  comorbiditiesCard: {
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    padding: 20,
    ...shadows.tier2,
  },
  sectionInstruction: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 14,
    ...font('body', 500),
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
    fontSize: 14,
    color: colors.textMuted,
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
    fontSize: 14,
    color: colors.textPrimary,
    ...font('heading', 700),
  },
  pillInputContainer: {
    height: 56,
    backgroundColor: colors.white,
    borderRadius: rounded.card,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.tier1,
  },
  pillInputText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    ...font('body', 600),
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  doctorCallBadge: {
    width: 32,
    height: 36,
    borderRadius: rounded.lg,
    backgroundColor: colors.mint.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  /* BANNER DE SINCRONIZAÇÃO */
  syncAlertCard: {
    flexDirection: 'row',
    backgroundColor: colors.mint.background,
    borderRadius: rounded.card,
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  syncIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: rounded.xl,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncAlertTitle: {
    fontSize: 14,
    color: colors.mint.textDark,
    marginBottom: 3,
    ...font('heading', 700),
  },
  syncAlertDescription: {
    fontSize: 14,
    color: colors.mint.textDark,
    lineHeight: 17,
    ...font('body', 500),
  },

  /* BOTÕES DE AÇÃO */
  actionButtonsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  primarySaveButton: {
    backgroundColor: colors.coralDark,
    borderRadius: rounded.full,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    ...shadows.tier2,
  },
  primarySaveButtonText: {
    color: colors.white,
    fontSize: 16,
    ...font('heading', 800),
  },
  secondaryHistoryButton: {
    backgroundColor: colors.white,
    borderRadius: rounded.full,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    ...shadows.tier1,
  },
  secondaryHistoryButtonText: {
    color: colors.primary,
    fontSize: 15,
    ...font('heading', 700),
  },

  /* CADASTRO (HU-008) E IDENTIDADE DE ACESSO (HU-009) */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
  },
  roleHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.input,
  },
  editButtonText: {
    color: colors.white,
    ...font('body', 700),
    fontSize: 14,
  },
  errorText: {
    color: colors.error,
    marginTop: 4,
    fontSize: 14,
    ...font('body', 600),
  },
  warningBox: {
    backgroundColor: colors.amber.background,
    borderColor: colors.amber.border,
    borderWidth: 1,
    borderRadius: rounded.input,
    padding: 10,
    marginTop: 10,
  },
  warningText: {
    fontSize: 14,
    color: colors.amber.textDark,
    ...font('body', 600),
  },
  sexRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sexButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.input,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  sexButtonDisabled: {
    backgroundColor: colors.canvasBase,
  },
  sexButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.infoSurface,
  },
  sexButtonText: {
    color: colors.onSurfaceVariant,
    ...font('body', 600),
    fontSize: 14,
  },
  sexButtonTextSelected: {
    color: colors.primary,
  },
  pillInputError: {
    borderWidth: 1,
    borderColor: colors.error,
  },
});
