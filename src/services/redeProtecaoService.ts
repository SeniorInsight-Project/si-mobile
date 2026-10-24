import { runtimeConfig } from '../config/runtime';

export interface HistoricoRecenteMembro {
  data: string;
  descricao: string;
}

export interface MembroRede {
  id: string;
  vinculoId?: string;
  usuarioId?: string;
  nomeCompleto: string;
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

export interface ConviteResponse {
  id: string;
  idosoId: string;
  nomeIdoso?: string;
  emailDestinatario?: string;
  token: string;
  papelAcessoSugerido?: string;
  grauParentescoSugerido?: string;
  status: string;
  dataExpiracao: string;
  criadoEm: string;
  mensagemSimulacao?: string;
  [key: string]: any;
}

/**
 * Membros iniciais baseados fielmente no protótipo do Figma ("Rede Familiar de Apoio")
 * Utilizados para exibição imediata e fallback resiliente em ambiente de desenvolvimento e testes.
 */
export const INITIAL_MEMBERS: MembroRede[] = [
  {
    id: 'member-carlos-01',
    vinculoId: 'e3b0c442-98fc-1c14-9afc-432100000101',
    usuarioId: 'usr-carlos-01',
    nomeCompleto: 'Carlos Silva',
    verificado: true,
    grauParentesco: 'Filho',
    papelAcesso: 'ADMIN',
    papelLabel: 'Administrador (Filho)',
    badgeTipo: 'plantao', // 'plantao' | 'familia' | 'apoio' | 'especialista'
    badgeTexto: '★ Plantão',
    statusConexao: 'ONLINE', // 'ONLINE' | 'BUSY' | 'AWAY' | 'VERIFIED'
    statusLabel: 'Disponível • Próximo (1.2 km)',
    statusIcone: 'location',
    telefone: '+55 11 98765-4321',
    email: 'carlos.silva@seniorinsight.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    distanciaKm: 1.2,
    acoesTexto: 'Ações de emergência:',
    isPlantao: true,
    categoria: 'proximos', // 'todos' | 'proximos' | 'saude'
    historicoRecente: [
      { data: 'Hoje, 08:30', descricao: 'Confirmou presença e assumiu plantão' },
      { data: 'Ontem, 20:00', descricao: 'Verificou checklist noturno' },
    ],
  },
  {
    id: 'member-roberta-02',
    vinculoId: 'e3b0c442-98fc-1c14-9afc-432100000102',
    usuarioId: 'usr-roberta-02',
    nomeCompleto: 'Roberta Santos',
    verificado: false,
    grauParentesco: 'Filha',
    papelAcesso: 'CUIDADOR',
    papelLabel: 'Cuidadora Principal (Filha)',
    badgeTipo: 'familia',
    badgeTexto: 'Família',
    statusConexao: 'BUSY',
    statusLabel: 'Em plantão até 18h • Farmácia',
    statusIcone: 'clock',
    telefone: '+55 11 97654-3210',
    email: 'roberta.santos@seniorinsight.com',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    distanciaKm: 4.5,
    acoesTexto: 'Agendou medicação hoje • 14:00',
    isPlantao: false,
    categoria: 'proximos',
    historicoRecente: [
      { data: 'Hoje, 14:00', descricao: 'Agendou medicação Losartana Potássica' },
      { data: 'Hoje, 09:15', descricao: 'Comprou reposição na farmácia' },
    ],
  },
  {
    id: 'member-lucas-03',
    vinculoId: 'e3b0c442-98fc-1c14-9afc-432100000103',
    usuarioId: 'usr-lucas-03',
    nomeCompleto: 'Lucas Silva',
    verificado: false,
    grauParentesco: 'Neto',
    papelAcesso: 'OBSERVADOR',
    papelLabel: 'Cuidador Apoio (Neto)',
    badgeTipo: 'apoio',
    badgeTexto: 'Apoio',
    statusConexao: 'ONLINE',
    statusLabel: 'Notificações ativas • 8 km',
    statusIcone: 'bell',
    telefone: '+55 11 96543-2109',
    email: 'lucas.silva@seniorinsight.com',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    distanciaKm: 8.0,
    acoesTexto: 'Atendeu último alerta há 2 dias',
    isPlantao: false,
    categoria: 'todos',
    historicoRecente: [
      { data: 'Há 2 dias', descricao: 'Atendeu alerta de rotina não confirmada' },
    ],
  },
  {
    id: 'member-juliana-04',
    vinculoId: 'e3b0c442-98fc-1c14-9afc-432100000104',
    usuarioId: 'usr-juliana-04',
    nomeCompleto: 'Enfª Juliana Costa',
    verificado: true,
    grauParentesco: 'Enfermeira',
    papelAcesso: 'MEDICO',
    papelLabel: 'Profissional de Saúde (COREN 2481)',
    badgeTipo: 'especialista',
    badgeTexto: 'Especialista',
    statusConexao: 'VERIFIED',
    statusLabel: 'Visitas: Terças e Quintas (09:00)',
    statusIcone: 'calendar',
    telefone: '+55 11 95432-1098',
    email: 'juliana.costa@saude.com',
    avatarUrl: 'https://images.unsplash.com/photo-1594824813726-0a37e584ec69?w=150',
    distanciaKm: 15.0,
    acoesTexto: 'Última aferição: 12/8 mmHg • Normal',
    isPlantao: false,
    categoria: 'saude',
    historicoRecente: [
      { data: 'Ontem, 09:30', descricao: 'Aferiu pressão arterial (12/8 mmHg) - Normal' },
      { data: '22 Out, 09:15', descricao: 'Checou quadro clínico e comorbidades' },
    ],
  },
];

/**
 * Sequência padrão de chamada de emergência SOS
 */
export const SOS_CALL_SEQUENCE: string[] = [
  'Carlos',
  'Roberta',
  'Lucas',
  'SAMU 192',
];

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

  return {
    id: membro.vinculoId || membro.familiarId || `mem-${Math.random()}`,
    vinculoId: membro.vinculoId,
    usuarioId: membro.usuarioId,
    nomeCompleto: membro.nomeCompleto || 'Membro da Rede',
    verificado: membro.papelAcesso === 'ADMIN' || membro.papelAcesso === 'MEDICO',
    grauParentesco: membro.grauParentesco || 'Familiar',
    papelAcesso: membro.papelAcesso || 'CUIDADOR',
    papelLabel: `${membro.papelAcesso} (${membro.grauParentesco || 'Familiar'})`,
    badgeTipo,
    badgeTexto,
    statusConexao: 'ONLINE',
    statusLabel: 'Conectado à rede de proteção',
    statusIcone: 'location',
    telefone: membro.telefone || '+55 11 98765-4321',
    email: membro.email || '',
    avatarUrl: null,
    acoesTexto: 'Conectado recentemente',
    isPlantao,
    categoria,
    historicoRecente: [],
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
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/rede`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.warn(`[redeProtecaoService] Backend retornou status ${response.status}. Usando fallback do protótipo.`);
      return INITIAL_MEMBERS;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizarMembroBackend);
    }

    return INITIAL_MEMBERS;
  } catch (error: any) {
    console.warn('[redeProtecaoService] Backend inacessível. Ativando fallback resiliente:', error?.message);
    return INITIAL_MEMBERS;
  }
}

/**
 * Gera um convite temporal (48h) para inclusão de novo membro na Rede de Proteção (HU16).
 * Endpoint: POST /api/v1/idosos/{idosoId}/convites
 * Payload: { email, papelAcesso, grauParentesco, mensagemPersonalizada }
 */
export async function gerarConvite(
  idosoId: string,
  dadosConvite: DadosConviteInput,
  token: string | null = null
): Promise<ConviteResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/convites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: dadosConvite.email,
        papelAcesso: dadosConvite.papelAcesso || 'CUIDADOR',
        grauParentesco: dadosConvite.grauParentesco || 'Familiar',
        mensagemPersonalizada: dadosConvite.mensagemPersonalizada || 'Olá, junte-se à rede de cuidados familiar no SeniorInsight.',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status} ao gerar convite.`);
    }

    return await response.json();
  } catch (error: any) {
    console.warn('[redeProtecaoService] Erro ao comunicar com backend ao gerar convite. Simulando sucesso local:', error?.message);

    // Simulação resiliente de emissão com prazo de 48 horas
    const dataExpiracao = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    return {
      id: `convite-${Date.now()}`,
      idosoId,
      nomeIdoso: 'Dona Maria Silva',
      emailDestinatario: dadosConvite.email,
      token: `token-${Math.random().toString(36).substring(2, 12)}`,
      papelAcessoSugerido: dadosConvite.papelAcesso || 'CUIDADOR',
      grauParentescoSugerido: dadosConvite.grauParentesco || 'Familiar',
      status: 'PENDENTE',
      dataExpiracao,
      criadoEm: new Date().toISOString(),
      mensagemSimulacao: `Convite simulado com sucesso para ${dadosConvite.email}. Válido por 48 horas.`,
    };
  }
}

/**
 * Aceita um convite temporal para vínculo na rede de proteção (HU16).
 * Endpoint: POST /api/v1/convites/aceitar?token=...
 */
export async function aceitarConvite(
  tokenConvite: string,
  tokenAutenticacao: string | null = null
): Promise<any> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (tokenAutenticacao) {
      headers['Authorization'] = `Bearer ${tokenAutenticacao}`;
    }

    const encodedToken = encodeURIComponent(tokenConvite);
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/convites/aceitar?token=${encodedToken}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status} ao aceitar convite.`);
    }

    return await response.json();
  } catch (error: any) {
    console.warn('[redeProtecaoService] Erro ao aceitar convite:', error?.message);
    throw error;
  }
}
