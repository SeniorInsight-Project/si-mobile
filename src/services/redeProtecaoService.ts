import { runtimeConfig } from '../config/runtime';
import { mockPermitido } from '../config/ambiente';
import type { ConviteRede, ConviteRedeRequest } from '../types/api';
import { resolverTokenAutorizacao } from './tokenStorageService';
import { extrairMensagemErro } from './erroHelper';

async function lerCorpoResposta(response: Response): Promise<unknown> {
  try {
    const texto = await response.text();
    try {
      return JSON.parse(texto);
    } catch {
      return texto;
    }
  } catch {
    return null;
  }
}

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

export interface ConvitePendente extends Partial<ConviteResponse> {
  id: string;
  emailDestinatario?: string;
  papelAcessoSugerido?: string;
  papelLabel?: string;
  grauParentescoSugerido?: string;
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
  const isPlantao = membro.papelAcesso === 'ADMIN' || membro.papelAcesso === 'CUIDADOR_PRINCIPAL';
  let badgeTipo = 'familia';
  let badgeTexto = 'Família';
  let categoria = 'proximos';

  if (membro.papelAcesso === 'ADMIN') {
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
    usuarioId: membro.usuarioId,
    nome: nomeCompleto,
    nomeCompleto,
    iniciais,
    avatarBg,
    avatarCor,
    subtitulo,
    verificado: membro.papelAcesso === 'ADMIN' || ehMedico,
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
    telefone: membro.telefone || '+55 11 98765-4321',
    email: membro.email || '',
    avatarUrl: membro.avatarUrl || null,
    acoesTexto: ehMedico ? 'Corpo clínico de Dona Maria' : 'Conectado recentemente',
    acoes,
    isPlantao,
    categoria: ehMedico ? 'saude' : categoria,
    historicoRecente: membro.historicoRecente || [],
  };
}

/**
 * Lista todos os membros vinculados à Rede de Proteção do Idoso (HU16).
 * Endpoint: GET /api/v1/idosos/{idosoId}/rede
 */
export async function listarMembrosRede(
  idosoId: string,
  token: string | null = null
): Promise<MembroRede[]> {
  if (mockPermitido()) {
    const { INITIAL_MEMBERS } = await import('../mocks/redeProtecao');
    return (INITIAL_MEMBERS as unknown as MembroRede[]).map(normalizarMembroBackend);
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/rede`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const corpo = await lerCorpoResposta(response);
      throw new Error(extrairMensagemErro(corpo, `Erro ${response.status} ao carregar a rede de proteção.`));
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map(normalizarMembroBackend);
    }

    return [];
  } catch (error: any) {
    throw new Error(extrairMensagemErro(error, 'Não foi possível carregar a rede de proteção.'));
  }
}

export const obterMembros = listarMembrosRede;

/**
 * Gera um convite temporal (48h/72h) para inclusão de novo membro na Rede de Proteção (HU16).
 * Endpoint: POST /api/v1/idosos/{idosoId}/convites
 * Payload: { email, papelAcesso, grauParentesco, mensagemPersonalizada }
 */
export async function gerarConvite(
  idosoId: string,
  dadosConvite: DadosConviteInput,
  token: string | null = null
): Promise<ConviteResponse> {
  if (mockPermitido()) {
    const { mockGerarConvite } = await import('../mocks/redeProtecao');
    return mockGerarConvite(idosoId, dadosConvite) as unknown as ConviteResponse;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/convites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: dadosConvite.email,
        papelAcesso: dadosConvite.papelAcesso || 'CUIDADOR',
        grauParentesco: dadosConvite.grauParentesco || 'Familiar',
        mensagemPersonalizada: dadosConvite.mensagemPersonalizada || 'Olá, junte-se à rede de cuidados familiar no SeniorInsight.',
      } satisfies ConviteRedeRequest),
    });

    if (!response.ok) {
      const errorData = await lerCorpoResposta(response);
      const erro: ErroComStatus = new Error(extrairMensagemErro(errorData, `Erro ${response.status} ao gerar convite.`));
      erro.status = response.status;
      throw erro;
    }

    const data = await response.json();
    const conviteFormatado: ConvitePendente = {
      ...data,
      linkConvite: `seniorinsight://convite/${data.token}`,
      linkWeb: `https://seniorinsight.app/convite/${data.token}`,
      papelLabel: (data.papelAcesso || dadosConvite.papelAcesso) === 'ADMIN' ? 'Administrador' : (data.papelAcesso || dadosConvite.papelAcesso) === 'OBSERVADOR' ? 'Observador' : 'Cuidador(a)',
      grauParentescoSugerido: data.grauParentesco || dadosConvite.grauParentesco || 'Familiar',
      emailDestinatario: data.email || dadosConvite.email,
    };
    return conviteFormatado as ConviteResponse;
  } catch (error: any) {
    if (error?.status) {
      throw error;
    }
    throw new Error(extrairMensagemErro(error, 'Erro ao gerar convite.'));
  }
}

/**
 * Consulta ou simula os dados informativos de um convite a partir de seu token (HU-013).
 */
export async function obterDetalhesConvite(tokenConvite: string): Promise<DetalhesConvite> {
  if (!tokenConvite || typeof tokenConvite !== 'string') {
    throw new Error('Token de convite inválido ou ausente.');
  }

  if (mockPermitido()) {
    const { mockObterDetalhesConvite } = await import('../mocks/redeProtecao');
    return mockObterDetalhesConvite(tokenConvite);
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const encodedToken = encodeURIComponent(tokenConvite.trim());
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/convites/detalhes?token=${encodedToken}`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const corpo = await lerCorpoResposta(response);
      const erro: ErroComStatus = new Error(extrairMensagemErro(corpo, `Erro ${response.status} ao consultar convite.`));
      erro.status = response.status;
      throw erro;
    }
    return await response.json();
  } catch (error: any) {
    if (error?.status) throw error;
    throw new Error(extrairMensagemErro(error, 'Erro ao consultar convite.'));
  }
}

/**
 * Aceita um convite temporal para vínculo na rede de proteção (HU16 / HU-013).
 * Endpoint: POST /api/v1/convites/aceitar?token=...
 */
export async function aceitarConvite(
  tokenConvite: string,
  tokenAutenticacao: string | null = null
): Promise<any> {
  if (mockPermitido()) {
    const { mockAceitarConvite } = await import('../mocks/redeProtecao');
    return mockAceitarConvite(tokenConvite);
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    const authToken = await resolverTokenAutorizacao(tokenAutenticacao);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const encodedToken = encodeURIComponent(tokenConvite);
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/convites/aceitar?token=${encodedToken}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorData = await lerCorpoResposta(response);
      let mensagem = extrairMensagemErro(errorData, `Erro ${response.status} ao aceitar convite.`);
      if (response.status === 410) {
        mensagem = 'Convite expirado. Peça um novo convite ao familiar administrador.';
      } else if (response.status === 409) {
        mensagem = typeof errorData === 'object' && errorData && (errorData as any).message
          ? (errorData as any).message
          : 'Você já possui vínculo ativo com este idoso na Rede de Proteção.';
      }
      const erro: ErroComStatus = new Error(mensagem);
      erro.status = response.status;
      throw erro;
    }

    return await response.json();
  } catch (error: any) {
    if (error?.status) throw error;
    throw new Error(extrairMensagemErro(error, 'Erro ao aceitar convite.'));
  }
}

/**
 * Lista todos os convites pendentes de um idoso (HU-012/HU-013).
 */
export async function listarConvitesPendentes(
  idosoId: string,
  token: string | null = null
): Promise<ConvitePendente[]> {
  if (mockPermitido()) {
    const { mockListarConvites } = await import('../mocks/redeProtecao');
    return mockListarConvites(idosoId) as unknown as ConvitePendente[];
  }

  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/convites/pendentes`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const corpo = await lerCorpoResposta(response);
      throw new Error(extrairMensagemErro(corpo, `Erro ${response.status} ao listar convites pendentes.`));
    }
    const data = await response.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch (error: any) {
    throw new Error(extrairMensagemErro(error, 'Não foi possível listar convites pendentes.'));
  }
}

/**
 * Cancela um convite pendente.
 */
export async function cancelarConvite(
  idosoId: string,
  conviteId: string,
  token: string | null = null
): Promise<boolean> {
  if (mockPermitido()) {
    const { mockCancelarConvite } = await import('../mocks/redeProtecao');
    return mockCancelarConvite(idosoId, conviteId);
  }

  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/convites/${conviteId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const corpo = await lerCorpoResposta(response);
      throw new Error(extrairMensagemErro(corpo, `Erro ${response.status} ao cancelar convite.`));
    }
    return true;
  } catch (err: any) {
    throw new Error(extrairMensagemErro(err, 'Não foi possível cancelar o convite.'));
  }
}

/**
 * Edita dados de um convite pendente (email, papel, grau, mensagem).
 */
export async function editarConvite(
  idosoId: string,
  conviteId: string,
  novosDados: Partial<DadosConviteInput>,
  token: string | null = null
): Promise<ConvitePendente | null> {
  if (mockPermitido()) {
    const { mockEditarConvite } = await import('../mocks/redeProtecao');
    return mockEditarConvite(idosoId, conviteId, novosDados) as unknown as ConvitePendente;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/convites/${conviteId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(novosDados),
    });
    if (!response.ok) {
      const corpo = await lerCorpoResposta(response);
      throw new Error(extrairMensagemErro(corpo, `Erro ${response.status} ao editar convite.`));
    }
    return await response.json();
  } catch (err: any) {
    throw new Error(extrairMensagemErro(err, 'Não foi possível editar o convite.'));
  }
}

/**
 * Obtém a contagem de médicos ativos/vinculados e convites pendentes conforme RN-012 (HU-016).
 * Regra RN-012: Limite máximo de até 2 médicos por idoso na rede de proteção.
 */
export async function obterContagemMedicos(idosoId: string): Promise<ContagemMedicos> {
  const membros = await listarMembrosRede(idosoId);
  const medicosVinculados = membros.filter(
    (m) => (m.papelAcesso === 'MEDICO' || m.tipoMembro === 'MEDICO') && (m.crm || m.grauParentesco === 'Médico' || m.grauParentesco === 'Médico(a)')
  );

  const pendentes = await listarConvitesPendentes(idosoId);
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
 * Gera convite de uso único para Médico de Referência do Idoso válido por 72h (HU-016 / RF-008).
 * Apenas o Familiar Administrador pode convidar médicos.
 * Se o limite de 2 médicos da RN-012 for atingido, bloqueia e retorna erro.
 */
export async function gerarConviteMedico(
  idosoId: string,
  dadosMedico: DadosConviteMedicoInput,
  options: GerarConviteMedicoOptions = {}
): Promise<ConvitePendente> {
  const { papelUsuario = 'ADMIN', token = null, ignorarLimite = false } = options;

  if (papelUsuario !== 'ADMIN' && !options.isAdmin) {
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
    const contagem = await obterContagemMedicos(idosoId);
    if (contagem.totalMedicos >= LIMITE_MEDICOS_RN012) {
      throw new Error('Limite de 2 médicos atingido');
    }
  }

  if (mockPermitido()) {
    const { mockGerarConviteMedico } = await import('../mocks/redeProtecao');
    return mockGerarConviteMedico(idosoId, dadosMedico) as unknown as ConvitePendente;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/convites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: emailDestinatario,
        papelAcesso: 'MEDICO',
        grauParentesco: 'Médico(a)',
        nomeMedico: dadosMedico.nome.trim(),
        crm: dadosMedico.crm.trim().toUpperCase(),
        mensagemPersonalizada: dadosMedico.mensagemPersonalizada || 'Convite para acompanhar os relatórios semanais e dados clínicos de Dona Maria no SeniorInsight.',
      }),
    });

    if (!response.ok) {
      const corpo = await lerCorpoResposta(response);
      throw new Error(extrairMensagemErro(corpo, `Erro ${response.status} ao gerar convite médico.`));
    }

    const data = await response.json();
    return {
      ...data,
      nomeMedico: dadosMedico.nome.trim(),
      crm: dadosMedico.crm.trim().toUpperCase(),
      validadeHorasRestantes: 72,
    };
  } catch (err: any) {
    throw new Error(extrairMensagemErro(err, 'Não foi possível gerar o convite do médico.'));
  }
}

/**
 * Marca um convite de médico como recusado (HU-017 Cenário 2).
 * Exibe a mensagem: "O médico recusou o convite"
 */
export async function recusarConvite(
  idosoId: string,
  conviteId: string,
  motivo = 'O médico recusou o convite'
): Promise<ConvitePendente> {
  if (mockPermitido()) {
    const { mockRecusarConvite } = await import('../mocks/redeProtecao');
    return mockRecusarConvite(idosoId, conviteId, motivo) as unknown as ConvitePendente;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/convites/${conviteId}/recusar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ motivo }),
    });
    if (!response.ok) {
      const corpo = await lerCorpoResposta(response);
      throw new Error(extrairMensagemErro(corpo, `Erro ${response.status} ao recusar convite.`));
    }
    return await response.json();
  } catch (err: any) {
    throw new Error(extrairMensagemErro(err, 'Não foi possível recusar o convite.'));
  }
}

/**
 * Descarta ou remove a notificação de convite recusado da visualização da família.
 */
export async function descartarConviteRecusado(idosoId: string, conviteId: string): Promise<boolean> {
  if (mockPermitido()) {
    const { mockDescartarConviteRecusado } = await import('../mocks/redeProtecao');
    return mockDescartarConviteRecusado(idosoId, conviteId);
  }

  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/convites/${conviteId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const corpo = await lerCorpoResposta(response);
      throw new Error(extrairMensagemErro(corpo, `Erro ${response.status} ao descartar convite recusado.`));
    }
    return true;
  } catch (err: any) {
    throw new Error(extrairMensagemErro(err, 'Não foi possível descartar o convite recusado.'));
  }
}




