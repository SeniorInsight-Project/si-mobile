import { mockPermitido } from '../config/ambiente';
import type {
  AceiteConvite,
  AtualizarConviteRequest,
  ConvitePublico,
  ConviteRede,
  ConviteRedeRequest,
  MembroRedeApi,
} from '../types/api';
import { apiClient, ApiError, type ApiClient } from './apiClient';
import { extrairMensagemErro } from './erroHelper';

export interface OpcoesRede {
  cliente?: Pick<ApiClient, 'get' | 'post' | 'patch' | 'delete'>;
}

/** Papéis de administrador: o contrato usa ADMINISTRADOR; ADMIN é o valor antigo do app. */
const ehPapelAdmin = (papel?: string | null) => papel === 'ADMINISTRADOR' || papel === 'ADMIN';

/**
 * Limites da Rede de Proteção conforme RN-012 do DRS
 */
export const LIMITE_MEDICOS_RN012 = 2;
export const LIMITE_FAMILIARES_RN012 = 5;

export interface HistoricoRecenteMembro {
  data: string;
  descricao: string;
}

export interface MembroRede {
  id: string;
  vinculoId?: string;
  usuarioId?: string;
  nome: string;
  nomeCompleto: string;
  iniciais: string;
  avatarBg: string;
  avatarCor: string;
  badgeBg: string;
  badgeCor: string;
  acoes: string[];
  subtitulo?: string;
  online?: boolean;
  infoIcon?: string;
  infoTexto?: string;
  infoDestaque?: boolean;
  crm?: string | null;
  especialidade?: string | null;
  tipoMembro?: string;
  statusMedico?: string | null;
  verificado: boolean;
  grauParentesco: string;
  papelAcesso: string;
  papelLabel: string;
  badgeTipo: string;
  badgeTexto: string;
  statusConexao: string;
  statusLabel: string;
  statusIcone: string;
  telefone: string;
  email: string;
  avatarUrl: string | null;
  distanciaKm?: number;
  acoesTexto: string;
  isPlantao: boolean;
  categoria: string;
  historicoRecente: HistoricoRecenteMembro[];
}

export interface DadosConviteInput {
  email: string;
  papelAcesso?: string;
  grauParentesco?: string;
  mensagemPersonalizada?: string;
}

export type ConviteInput = DadosConviteInput;

export interface DadosConviteMedicoInput {
  nome: string;
  crm: string;
  email: string;
  mensagemPersonalizada?: string;
}

export interface GerarConviteMedicoOptions {
  papelUsuario?: string;
  token?: string | null;
  ignorarLimite?: boolean;
  isAdmin?: boolean;
}

export interface ContagemMedicos {
  totalMedicos: number;
  limiteAtingido: boolean;
  limiteMaximo: number;
  medicosVinculados: MembroRede[];
  medicosPendentes: ConvitePendente[];
  medicosRecusados: ConvitePendente[];
}

/** ConviteRede do contrato care-v1; o app sempre tem o token (vem da API ou do fallback local). */
export interface ConviteResponse extends Omit<ConviteRede, 'token' | 'status' | 'emailDestinatario'> {
  token: string;
  emailDestinatario?: string;
  /** StatusConvite do contrato; string porque o fallback local também grava aqui. */
  status: string;
  [key: string]: any;
}

export interface ConvitePendente extends Partial<Omit<ConviteResponse, 'papelAcessoSugerido' | 'grauParentescoSugerido'>> {
  id: string;
  emailDestinatario?: string;
  /** PapelAcesso do contrato; string porque os mocks e convites antigos também passam por aqui. */
  papelAcessoSugerido?: string;
  papelLabel?: string;
  grauParentescoSugerido?: string | null;
  mensagemPersonalizada?: string;
  linkConvite?: string;
  linkWeb?: string;
  validadeHorasRestantes?: number;
}

export type ErroComStatus = Error & { status?: number };

export interface DetalhesConvite {
  token: string;
  nomeIdoso: string;
  idadeIdoso?: number;
  solicitanteNome?: string;
  solicitanteGrau?: string;
  papelAcessoSugerido: string;
  papelLabel?: string;
  grauParentescoSugerido: string;
  status: string;
  expirado: boolean;
  mensagem?: string;
  dataExpiracao?: string;
}

/**
 * Normaliza os dados retornados do backend para o formato exibido na UI.
 */
function normalizarMembroBackend(membro: any): MembroRede {
  const isPlantao = ehPapelAdmin(membro.papelAcesso) || membro.papelAcesso === 'CUIDADOR_PRINCIPAL';
  let badgeTipo = 'familia';
  let badgeTexto = 'Família';
  let categoria = 'proximos';

  if (ehPapelAdmin(membro.papelAcesso)) {
    badgeTipo = 'plantao';
    badgeTexto = '★ Plantão';
    categoria = 'proximos';
  } else if (membro.papelAcesso === 'CUIDADOR' || membro.papelAcesso === 'CUIDADOR_PRINCIPAL') {
    badgeTipo = 'familia';
    badgeTexto = 'Família';
    categoria = 'proximos';
  } else if (membro.papelAcesso === 'MEDICO' || membro.papelAcesso === 'ESPECIALISTA') {
    badgeTipo = 'especialista';
    badgeTexto = 'Especialista';
    categoria = 'saude';
  } else {
    badgeTipo = 'apoio';
    badgeTexto = 'Apoio';
    categoria = 'todos';
  }

  const nomeCompleto = membro.nomeCompleto || membro.nome || 'Membro da Rede';
  const iniciais = nomeCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0].toUpperCase())
    .join('') || 'MR';

  let avatarBg = '#EBF5FF';
  let avatarCor = '#031753';
  let badgeBg = '#EBF5FF';
  let badgeCor = '#2D418A';

  if (badgeTipo === 'plantao') {
    avatarBg = '#EBF5FF';
    avatarCor = '#031753';
    badgeBg = '#E8F8F0';
    badgeCor = '#003B26';
  } else if (badgeTipo === 'especialista') {
    avatarBg = '#FFEBE7';
    avatarCor = '#B51C13';
    badgeBg = '#FFEBE7';
    badgeCor = '#B51C13';
  } else if (badgeTipo === 'apoio') {
    avatarBg = '#F2F4F7';
    avatarCor = '#475467';
    badgeBg = '#F2F4F7';
    badgeCor = '#64748B';
  } else {
    avatarBg = '#E8F8F0';
    avatarCor = '#003B26';
    badgeBg = '#EBF5FF';
    badgeCor = '#2D418A';
  }

  const acoes = isPlantao
    ? ['call_primary', 'whatsapp_primary', 'history']
    : membro.papelAcesso === 'MEDICO'
    ? ['call', 'prontuario']
    : ['call', 'whatsapp'];

  const ehMedico = membro.papelAcesso === 'MEDICO' || Boolean(membro.crm) || membro.tipoMembro === 'MEDICO';
  const crmFormatado = membro.crm ? `CRM ${membro.crm}` : null;
  const subtitulo = crmFormatado
    ? `${membro.grauParentesco || 'Médico(a)'} • ${crmFormatado}`
    : `${membro.grauParentesco || 'Familiar'} • Conectado à rede`;

  return {
    id: membro.vinculoId || membro.familiarId || membro.id || `mem-${Math.random()}`,
    vinculoId: membro.vinculoId,
    // TODO(si-care-service#105): até o care devolver usuarioId, o id do usuário vem em keycloakSub.
    usuarioId: membro.usuarioId ?? membro.keycloakSub ?? undefined,
    nome: nomeCompleto,
    nomeCompleto,
    iniciais,
    avatarBg,
    avatarCor,
    subtitulo,
    verificado: ehPapelAdmin(membro.papelAcesso) || ehMedico,
    grauParentesco: membro.grauParentesco || (ehMedico ? 'Médico(a)' : 'Familiar'),
    crm: membro.crm || null,
    especialidade: membro.especialidade || (ehMedico ? 'Médico de Referência' : null),
    tipoMembro: ehMedico ? 'MEDICO' : 'FAMILIAR',
    statusMedico: ehMedico ? (membro.statusMedico || 'VINCULADO') : null,
    papelAcesso: membro.papelAcesso || (ehMedico ? 'MEDICO' : 'CUIDADOR'),
    papelLabel: membro.papelLabel || (ehMedico ? `Médico(a) (${crmFormatado || 'Especialista'})` : `${membro.papelAcesso} (${membro.grauParentesco || 'Familiar'})`),
    badgeTipo,
    badgeTexto: ehMedico && !membro.badgeTexto ? 'Médico Vinculado' : (membro.badgeTexto || badgeTexto),
    badgeBg,
    badgeCor,
    online: true,
    statusConexao: 'ONLINE',
    statusLabel: ehMedico ? (membro.statusLabel || 'Acompanhamento semanal ativo') : 'Conectado à rede de proteção',
    statusIcone: ehMedico ? 'stethoscope' : 'location',
    infoIcon: isPlantao ? 'notifications' : ehMedico ? 'description' : 'schedule',
    infoTexto: isPlantao ? 'Recebe alertas SOS críticos' : ehMedico ? 'Relatório semanal de saúde ativo' : 'Notificações de cuidado ativas',
    infoDestaque: isPlantao,
    // Sem telefone do back, fica vazio: a UI já mostra "Telefone indisponível" em vez de discar um número falso.
    telefone: membro.telefone || '',
    email: membro.email || '',
    avatarUrl: membro.avatarUrl || null,
    acoesTexto: ehMedico ? 'Corpo clínico do idoso' : 'Conectado recentemente',
    acoes,
    isPlantao,
    categoria: ehMedico ? 'saude' : categoria,
    historicoRecente: membro.historicoRecente || [],
  };
}

/**
 * Lista todos os membros vinculados à Rede de Proteção do Idoso (HU16).
 * Endpoint: GET /api/v1/idosos/{idosoId}/rede. Lista vazia fica vazia; erro lança (a tela mostra a falha).
 */
export async function listarMembrosRede(
  idosoId: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<MembroRede[]> {
  if (mockPermitido()) {
    const { INITIAL_MEMBERS } = await import('../mocks/redeProtecao');
    return (INITIAL_MEMBERS as unknown as MembroRede[]).map(normalizarMembroBackend);
  }

  const data = await cliente.get<MembroRedeApi[]>(`/api/v1/idosos/${idosoId}/rede`);
  return Array.isArray(data) ? data.map(normalizarMembroBackend) : [];
}

export const obterMembros = listarMembrosRede;

const ROTULO_PAPEL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CUIDADOR: 'Cuidador(a)',
  OBSERVADOR: 'Observador',
  MEDICO: 'Médico(a)',
};

const rotuloPapel = (papel?: string | null) => (ehPapelAdmin(papel) ? 'Administrador' : ROTULO_PAPEL[papel ?? ''] ?? 'Cuidador(a)');

/** Monta o convite exibido na UI a partir do ConviteRede do contrato. */
function formatarConvite(data: ConviteRede, extras: Partial<ConvitePendente> = {}): ConvitePendente {
  return {
    ...data,
    linkConvite: data.token ? `seniorinsight://convite/${data.token}` : undefined,
    linkWeb: data.token ? `https://seniorinsight.app/convite/${data.token}` : undefined,
    papelLabel: rotuloPapel(data.papelAcessoSugerido),
    ...extras,
  };
}

/**
 * Gera um convite temporal para inclusão de novo membro na Rede de Proteção (HU16).
 * Endpoint: POST /api/v1/idosos/{idosoId}/convites (ConviteRedeRequest). Erros 400/403/404/409 lançam ApiError.
 */
export async function gerarConvite(
  idosoId: string,
  dadosConvite: DadosConviteInput,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<ConviteResponse> {
  if (mockPermitido()) {
    const { mockGerarConvite } = await import('../mocks/redeProtecao');
    return mockGerarConvite(idosoId, dadosConvite) as unknown as ConviteResponse;
  }

  const corpo = {
    email: dadosConvite.email,
    papelAcesso: (dadosConvite.papelAcesso || 'CUIDADOR') as ConviteRedeRequest['papelAcesso'],
    grauParentesco: dadosConvite.grauParentesco || 'Familiar',
    mensagemPersonalizada: dadosConvite.mensagemPersonalizada || 'Olá, junte-se à rede de cuidados familiar no SeniorInsight.',
  } satisfies ConviteRedeRequest;

  const data = await cliente.post<ConviteRede>(`/api/v1/idosos/${idosoId}/convites`, corpo);
  return formatarConvite(data) as ConviteResponse;
}

/**
 * Consulta os dados de um convite pelo token, antes de aceitar (HU-013).
 * Endpoint: GET /api/v1/convites?token= (ConvitePublico). 404 token inexistente, 409 já aceito, 410 expirado.
 */
export async function obterDetalhesConvite(
  tokenConvite: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<DetalhesConvite> {
  if (!tokenConvite || typeof tokenConvite !== 'string') {
    throw new Error('Token de convite inválido ou ausente.');
  }

  if (mockPermitido()) {
    const { mockObterDetalhesConvite } = await import('../mocks/redeProtecao');
    return mockObterDetalhesConvite(tokenConvite);
  }

  const token = tokenConvite.trim();
  const c = await cliente.get<ConvitePublico>(`/api/v1/convites?token=${encodeURIComponent(token)}`);
  const expiraEm = Date.parse(c.expiraEm);
  return {
    token,
    nomeIdoso: c.primeiroNomeIdoso,
    solicitanteNome: c.nomeConvidante,
    solicitanteGrau: c.grauParentesco ?? undefined,
    papelAcessoSugerido: c.papelAcesso,
    papelLabel: rotuloPapel(c.papelAcesso),
    grauParentescoSugerido: c.grauParentesco ?? '',
    status: c.status,
    expirado: c.status === 'EXPIRADO' || (Number.isFinite(expiraEm) && expiraEm < Date.now()),
    dataExpiracao: c.expiraEm,
  };
}

const MENSAGENS_ACEITE: Record<number, string> = {
  400: 'Este convite é inválido. Peça um novo convite ao familiar administrador.',
  403: 'Sua conta não tem permissão para aceitar este convite.',
  410: 'Convite expirado. Peça um novo convite ao familiar administrador.',
};

/**
 * Aceita um convite e cria o vínculo na rede de proteção (HU16 / HU-013).
 * Endpoint: POST /api/v1/convites/aceitar?token=. Só devolve o AceiteConvite do servidor: em 400/403/409/410
 * (e qualquer outro erro) lança ApiError com a mensagem para a tela e nunca devolve um vínculo.
 */
export async function aceitarConvite(
  tokenConvite: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<AceiteConvite> {
  if (mockPermitido()) {
    const { mockAceitarConvite } = await import('../mocks/redeProtecao');
    return mockAceitarConvite(tokenConvite);
  }

  try {
    return await cliente.post<AceiteConvite>(`/api/v1/convites/aceitar?token=${encodeURIComponent(tokenConvite)}`);
  } catch (erro) {
    if (erro instanceof ApiError && !erro.erroDeRede) {
      const mensagem =
        erro.status === 409
          ? extrairMensagemErro(erro.corpo, 'Você já possui vínculo ativo com este idoso ou o limite da rede foi atingido.')
          : MENSAGENS_ACEITE[erro.status];
      if (mensagem) throw new ApiError(erro.status, erro.corpo, erro.url, mensagem);
    }
    throw erro;
  }
}

/**
 * Lista os convites pendentes de um idoso (HU-012/HU-013).
 * Endpoint: GET /api/v1/idosos/{idosoId}/convites/pendentes. Lista vazia fica vazia; erro lança.
 */
export async function listarConvitesPendentes(
  idosoId: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<ConvitePendente[]> {
  if (mockPermitido()) {
    const { mockListarConvites } = await import('../mocks/redeProtecao');
    return mockListarConvites(idosoId) as unknown as ConvitePendente[];
  }

  const data = await cliente.get<ConviteRede[]>(`/api/v1/idosos/${idosoId}/convites/pendentes`);
  return Array.isArray(data) ? data.map((c) => formatarConvite(c)) : [];
}

/**
 * Cancela um convite pendente. Endpoint: DELETE /api/v1/convites/{conviteId} (204).
 */
export async function cancelarConvite(
  idosoId: string,
  conviteId: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<boolean> {
  if (mockPermitido()) {
    const { mockCancelarConvite } = await import('../mocks/redeProtecao');
    return mockCancelarConvite(idosoId, conviteId);
  }

  await cliente.delete(`/api/v1/convites/${conviteId}`);
  return true;
}

/**
 * Edita dados de um convite pendente (só os campos enviados).
 * Endpoint: PATCH /api/v1/convites/{conviteId} (AtualizarConviteRequest).
 */
export async function editarConvite(
  idosoId: string,
  conviteId: string,
  novosDados: Partial<DadosConviteInput>,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<ConvitePendente | null> {
  if (mockPermitido()) {
    const { mockEditarConvite } = await import('../mocks/redeProtecao');
    return mockEditarConvite(idosoId, conviteId, novosDados) as unknown as ConvitePendente;
  }

  const corpo: AtualizarConviteRequest = {};
  if (novosDados.email !== undefined) corpo.email = novosDados.email;
  if (novosDados.papelAcesso !== undefined) corpo.papelAcesso = novosDados.papelAcesso as AtualizarConviteRequest['papelAcesso'];
  if (novosDados.grauParentesco !== undefined) corpo.grauParentesco = novosDados.grauParentesco;
  if (novosDados.mensagemPersonalizada !== undefined) corpo.mensagemPersonalizada = novosDados.mensagemPersonalizada;

  const data = await cliente.patch<ConviteRede>(`/api/v1/convites/${conviteId}`, corpo);
  return formatarConvite(data);
}

/**
 * Obtém a contagem de médicos ativos/vinculados e convites pendentes conforme RN-012 (HU-016).
 * Regra RN-012: Limite máximo de até 2 médicos por idoso na rede de proteção.
 */
export async function obterContagemMedicos(idosoId: string, opcoes: OpcoesRede = {}): Promise<ContagemMedicos> {
  const membros = await listarMembrosRede(idosoId, opcoes);
  const medicosVinculados = membros.filter(
    (m) => (m.papelAcesso === 'MEDICO' || m.tipoMembro === 'MEDICO') && (m.crm || m.grauParentesco === 'Médico' || m.grauParentesco === 'Médico(a)')
  );

  const pendentes = await listarConvitesPendentes(idosoId, opcoes);
  const medicosPendentes = pendentes.filter(
    (c) => c.status === 'PENDENTE' && (c.papelAcessoSugerido === 'MEDICO' || c.crm || c.tipoMembro === 'MEDICO')
  );

  const medicosRecusados = pendentes.filter(
    (c) => c.status === 'RECUSADO' && (c.papelAcessoSugerido === 'MEDICO' || c.crm || c.tipoMembro === 'MEDICO')
  );

  const totalMedicos = medicosVinculados.length + medicosPendentes.length;

  return {
    totalMedicos,
    limiteAtingido: totalMedicos >= LIMITE_MEDICOS_RN012,
    limiteMaximo: LIMITE_MEDICOS_RN012,
    medicosVinculados,
    medicosPendentes,
    medicosRecusados,
  };
}

/**
 * Gera convite de uso único para Médico de Referência do Idoso (HU-016 / RF-008).
 * Apenas o Familiar Administrador pode convidar médicos.
 * Se o limite de 2 médicos da RN-012 for atingido, bloqueia e retorna erro.
 *
 * O contrato (ConviteRedeRequest) não tem nome nem CRM: o POST leva só email, papelAcesso "MEDICO",
 * grauParentesco e mensagemPersonalizada. Nome e CRM ficam só na resposta exibida na tela.
 */
export async function gerarConviteMedico(
  idosoId: string,
  dadosMedico: DadosConviteMedicoInput,
  options: GerarConviteMedicoOptions = {},
  { cliente = apiClient }: OpcoesRede = {}
): Promise<ConvitePendente> {
  const { papelUsuario = 'ADMINISTRADOR', ignorarLimite = false } = options;

  if (!ehPapelAdmin(papelUsuario) && !options.isAdmin) {
    throw new Error('Apenas o Familiar Administrador tem permissão para convidar médicos.');
  }

  if (!dadosMedico?.nome || !dadosMedico.nome.trim()) {
    throw new Error('O nome do médico é obrigatório.');
  }

  if (!dadosMedico?.crm || !dadosMedico.crm.trim()) {
    throw new Error('O CRM do médico é obrigatório.');
  }

  const emailDestinatario = (dadosMedico?.email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailDestinatario || !emailRegex.test(emailDestinatario)) {
    throw new Error('Por favor, informe um endereço de e-mail válido para o médico.');
  }

  if (!ignorarLimite) {
    const contagem = await obterContagemMedicos(idosoId, { cliente });
    if (contagem.totalMedicos >= LIMITE_MEDICOS_RN012) {
      throw new Error('Limite de 2 médicos atingido');
    }
  }

  if (mockPermitido()) {
    const { mockGerarConviteMedico } = await import('../mocks/redeProtecao');
    return mockGerarConviteMedico(idosoId, dadosMedico) as unknown as ConvitePendente;
  }

  const corpo = {
    email: emailDestinatario,
    papelAcesso: 'MEDICO',
    grauParentesco: 'Médico(a)',
    mensagemPersonalizada:
      dadosMedico.mensagemPersonalizada || 'Convite para acompanhar os relatórios semanais e dados clínicos no SeniorInsight.',
  } satisfies ConviteRedeRequest;

  const data = await cliente.post<ConviteRede>(`/api/v1/idosos/${idosoId}/convites`, corpo);
  const expiraEm = Date.parse(data.dataExpiracao);
  return formatarConvite(data, {
    nomeMedico: dadosMedico.nome.trim(),
    crm: dadosMedico.crm.trim().toUpperCase(),
    ...(Number.isFinite(expiraEm)
      ? { validadeHorasRestantes: Math.max(0, Math.round((expiraEm - Date.now()) / 3_600_000)) }
      : {}),
  });
}

/**
 * Marca um convite de médico como recusado (HU-017 Cenário 2).
 * Atenção: esta rota NÃO existe no care-v1 (e StatusConvite não tem RECUSADO); o path foi mantido a pedido
 * até o back definir o fluxo, então fora do mock a chamada responde 404 e o erro aparece na tela.
 */
export async function recusarConvite(
  idosoId: string,
  conviteId: string,
  motivo = 'O médico recusou o convite',
  { cliente = apiClient }: OpcoesRede = {}
): Promise<ConvitePendente> {
  if (mockPermitido()) {
    const { mockRecusarConvite } = await import('../mocks/redeProtecao');
    return mockRecusarConvite(idosoId, conviteId, motivo) as unknown as ConvitePendente;
  }

  return cliente.post<ConvitePendente>(`/api/v1/idosos/${idosoId}/convites/${conviteId}/recusar`, { motivo });
}

/**
 * Descarta a notificação de convite recusado da visualização da família.
 * Atenção: DELETE /api/v1/idosos/{idosoId}/convites/{conviteId} também não existe no care-v1 (mesmo motivo
 * de recusarConvite).
 */
export async function descartarConviteRecusado(
  idosoId: string,
  conviteId: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<boolean> {
  if (mockPermitido()) {
    const { mockDescartarConviteRecusado } = await import('../mocks/redeProtecao');
    return mockDescartarConviteRecusado(idosoId, conviteId);
  }

  await cliente.delete(`/api/v1/idosos/${idosoId}/convites/${conviteId}`);
  return true;
}
