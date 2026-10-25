import { runtimeConfig } from '../config/runtime.js';

/**
 * Limites da Rede de Proteção conforme RN-012 do DRS
 */
export const LIMITE_MEDICOS_RN012 = 2;
export const LIMITE_FAMILIARES_RN012 = 5;

/**
 * Membros iniciais baseados fielmente no protótipo do Figma ("Rede Familiar de Apoio")
 * Utilizados para exibição imediata e fallback resiliente em ambiente de desenvolvimento e testes.
 */
export const INITIAL_MEMBERS = [
  {
    id: 'member-carlos-01',
    vinculoId: 'e3b0c442-98fc-1c14-9afc-432100000101',
    usuarioId: 'usr-carlos-01',
    nome: 'Carlos Silva',
    nomeCompleto: 'Carlos Silva',
    iniciais: 'CS',
    avatarBg: '#EBF5FF',
    avatarCor: '#031753',
    badgeBg: '#E8F8F0',
    badgeCor: '#003B26',
    acoes: ['call_primary', 'whatsapp_primary', 'history'],
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
    nome: 'Roberta Santos',
    nomeCompleto: 'Roberta Santos',
    iniciais: 'RS',
    avatarBg: '#E8F8F0',
    avatarCor: '#003B26',
    badgeBg: '#EBF5FF',
    badgeCor: '#2D418A',
    acoes: ['call', 'whatsapp'],
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
    nome: 'Lucas Silva',
    nomeCompleto: 'Lucas Silva',
    iniciais: 'LS',
    avatarBg: '#F2F4F7',
    avatarCor: '#475467',
    badgeBg: '#F2F4F7',
    badgeCor: '#64748B',
    acoes: ['call', 'whatsapp'],
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
    nome: 'Enfª Juliana Costa',
    nomeCompleto: 'Enfª Juliana Costa',
    iniciais: 'JC',
    avatarBg: '#FFEBE7',
    avatarCor: '#B51C13',
    badgeBg: '#FFEBE7',
    badgeCor: '#B51C13',
    acoes: ['call', 'prontuario'],
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
export const SOS_CALL_SEQUENCE = [
  'Carlos',
  'Roberta',
  'Lucas',
  'SAMU 192',
];

/**
 * Normaliza os dados retornados do backend para o formato exibido na UI.
 */
function normalizarMembroBackend(membro) {
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
    .map((p) => p[0].toUpperCase())
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
export async function listarMembrosRede(idosoId, token = null) {
  try {
    const headers = {
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
      return INITIAL_MEMBERS.map(normalizarMembroBackend);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizarMembroBackend);
    }

    return INITIAL_MEMBERS.map(normalizarMembroBackend);
  } catch (error) {
    console.warn('[redeProtecaoService] Backend inacessível. Ativando fallback resiliente:', error.message);
    return INITIAL_MEMBERS.map(normalizarMembroBackend);
  }
}

/**
 * Convites pendentes iniciais para exibição imediata e fallback resiliente
 */
export const CONVITES_PENDENTES_INICIAIS = [
  {
    id: 'conv-pend-01',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nomeIdoso: 'Dona Maria Silva',
    emailDestinatario: 'marina.silva@exemplo.com',
    papelAcessoSugerido: 'CUIDADOR',
    papelLabel: 'Cuidadora Principal',
    grauParentescoSugerido: 'Sobrinha',
    mensagemPersonalizada: 'Oi Marina, junte-se à rede de cuidados da vovó Maria!',
    token: 'tok-marina-48h',
    linkConvite: 'seniorinsight://convite/tok-marina-48h',
    status: 'PENDENTE',
    criadoEm: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    dataExpiracao: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
    validadeHorasRestantes: 46,
  },
  {
    id: 'conv-med-rec-01',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nomeIdoso: 'Dona Maria Silva',
    nomeMedico: 'Dra. Camila Souza',
    crm: '987654/SP',
    emailDestinatario: 'camila.souza@geriatria.med.br',
    papelAcessoSugerido: 'MEDICO',
    papelLabel: 'Médico(a) Especialista',
    grauParentescoSugerido: 'Médico(a)',
    tipoMembro: 'MEDICO',
    mensagemPersonalizada: 'Convite para acompanhar os relatórios semanais de saúde de Dona Maria.',
    token: 'tok-camila-recusado',
    linkConvite: 'seniorinsight://convite/tok-camila-recusado',
    status: 'RECUSADO',
    mensagemRecusa: 'O médico recusou o convite',
    criadoEm: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    recusadoEm: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    validadeHorasRestantes: 48,
  },
];

let convitesPendentesEmMemoria = [...CONVITES_PENDENTES_INICIAIS];

/**
 * Simulação de geração de convite temporal (48h) para testes e fallback offline.
 */
function simularGeracaoConvite(idosoId, dadosConvite) {
  const dataExpiracao = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const tokenSimulado = `token-${Math.random().toString(36).substring(2, 12)}`;
  const novoConvite = {
    id: `convite-${Date.now()}`,
    idosoId,
    nomeIdoso: 'Dona Maria Silva',
    emailDestinatario: dadosConvite.email,
    token: tokenSimulado,
    linkConvite: `seniorinsight://convite/${tokenSimulado}`,
    linkWeb: `https://seniorinsight.app/convite/${tokenSimulado}`,
    papelAcessoSugerido: dadosConvite.papelAcesso || 'CUIDADOR',
    papelLabel: dadosConvite.papelAcesso === 'ADMIN' ? 'Administrador' : dadosConvite.papelAcesso === 'OBSERVADOR' ? 'Observador' : 'Cuidador(a)',
    grauParentescoSugerido: dadosConvite.grauParentesco || 'Familiar',
    mensagemPersonalizada: dadosConvite.mensagemPersonalizada || '',
    status: 'PENDENTE',
    dataExpiracao,
    criadoEm: new Date().toISOString(),
    mensagemSimulacao: `Convite simulado com sucesso para ${dadosConvite.email}. Válido por 48 horas.`,
    validadeHorasRestantes: 48,
  };
  convitesPendentesEmMemoria = [novoConvite, ...convitesPendentesEmMemoria.filter((c) => c.emailDestinatario !== dadosConvite.email)];
  return novoConvite;
}

/**
 * Gera um convite temporal (48h/72h) para inclusão de novo membro na Rede de Proteção (HU16).
 * Endpoint: POST /api/v1/idosos/{idosoId}/convites
 * Payload: { email, papelAcesso, grauParentesco, mensagemPersonalizada }
 */
export async function gerarConvite(idosoId, dadosConvite, token = null) {
  try {
    const headers = {
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
      if (response.status === 404) {
        console.warn('[redeProtecaoService] Backend retornou 404 ao gerar convite. Ativando fallback resiliente.');
        return simularGeracaoConvite(idosoId, dadosConvite);
      }

      const errorData = await response.json().catch(() => ({}));
      const erro = new Error(errorData.message || `Erro ${response.status} ao gerar convite.`);
      erro.status = response.status;
      throw erro;
    }

    const data = await response.json();
    const conviteFormatado = {
      ...data,
      linkConvite: `seniorinsight://convite/${data.token}`,
      linkWeb: `https://seniorinsight.app/convite/${data.token}`,
      papelLabel: (data.papelAcesso || dadosConvite.papelAcesso) === 'ADMIN' ? 'Administrador' : (data.papelAcesso || dadosConvite.papelAcesso) === 'OBSERVADOR' ? 'Observador' : 'Cuidador(a)',
      grauParentescoSugerido: data.grauParentesco || dadosConvite.grauParentesco || 'Familiar',
      emailDestinatario: data.email || dadosConvite.email,
    };
    convitesPendentesEmMemoria = [conviteFormatado, ...convitesPendentesEmMemoria.filter((c) => c.emailDestinatario !== dadosConvite.email)];
    return conviteFormatado;
  } catch (error) {
    if (error.status && error.status !== 404) {
      // Erro de regra de negócio retornado pela API (ex: 409, 400, 403) - deve ser propagado
      throw error;
    }

    console.warn('[redeProtecaoService] Erro ao comunicar com backend ao gerar convite. Simulando sucesso local:', error.message);
    return simularGeracaoConvite(idosoId, dadosConvite);
  }
}

/**
 * Consulta ou simula os dados informativos de um convite a partir de seu token (HU-013).
 */
export async function obterDetalhesConvite(tokenConvite) {
  if (!tokenConvite || typeof tokenConvite !== 'string') {
    throw new Error('Token de convite inválido ou ausente.');
  }

  const tokenLimpo = tokenConvite.trim();

  // Verifica se o token simula expiração para testes
  if (tokenLimpo.toLowerCase().includes('expirado')) {
    return {
      token: tokenLimpo,
      nomeIdoso: 'Dona Maria Silva',
      papelAcessoSugerido: 'CUIDADOR',
      grauParentescoSugerido: 'Familiar de Apoio',
      status: 'EXPIRADO',
      expirado: true,
      mensagem: 'Convite expirado. O prazo de validade temporal de 48 horas foi ultrapassado.',
    };
  }

  // Retorna os dados informativos do convite para a tela de aceite
  return {
    token: tokenLimpo,
    nomeIdoso: 'Dona Maria Silva',
    idadeIdoso: 76,
    solicitanteNome: 'Carlos Silva',
    solicitanteGrau: 'Filho (Administrador)',
    papelAcessoSugerido: 'CUIDADOR',
    papelLabel: 'Familiar de Apoio',
    grauParentescoSugerido: 'Familiar',
    status: 'PENDENTE',
    expirado: false,
    dataExpiracao: new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
  };
}

/**
 * Aceita um convite temporal para vínculo na rede de proteção (HU16 / HU-013).
 * Endpoint: POST /api/v1/convites/aceitar?token=...
 */
export async function aceitarConvite(tokenConvite, tokenAutenticacao = null) {
  try {
    const headers = {
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
      if (response.status === 404) {
        console.warn('[redeProtecaoService] Backend retornou 404 para aceitarConvite. Ativando fallback resiliente.');
        if (tokenConvite && tokenConvite.toLowerCase().includes('expirado')) {
          const err = new Error('Convite expirado. Peça um novo convite ao familiar administrador.');
          err.status = 410;
          throw err;
        }
        return {
          vinculoId: `vinculo-${Date.now()}`,
          idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
          nomeIdoso: 'Dona Maria Silva',
          familiarId: `familiar-${Date.now()}`,
          nomeFamiliar: 'Familiar Convidado',
          grauParentesco: 'Familiar',
          papelAcesso: 'CUIDADOR',
          criadoEm: new Date().toISOString(),
          mensagem: 'Convite aceito com sucesso! Vínculo criado na Rede de Proteção de Dona Maria Silva.',
        };
      }

      const errorData = await response.json().catch(() => ({}));
      let mensagem = errorData.message || `Erro ${response.status} ao aceitar convite.`;
      if (response.status === 410) {
        mensagem = 'Convite expirado. Peça um novo convite ao familiar administrador.';
      } else if (response.status === 409) {
        mensagem = errorData.message || 'Você já possui vínculo ativo com este idoso na Rede de Proteção.';
      }
      const erro = new Error(mensagem);
      erro.status = response.status;
      throw erro;
    }

    return await response.json();
  } catch (error) {
    if (error.status && error.status !== 404) {
      throw error;
    }

    console.warn('[redeProtecaoService] Erro ao aceitar convite no backend. Verificando fallback:', error.message);
    
    // Tratamento de convite expirado no fallback de teste
    if (tokenConvite && tokenConvite.toLowerCase().includes('expirado')) {
      const err = new Error('Convite expirado. Peça um novo convite ao familiar administrador.');
      err.status = 410;
      throw err;
    }

    return {
      vinculoId: `vinculo-${Date.now()}`,
      idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
      nomeIdoso: 'Dona Maria Silva',
      familiarId: `familiar-${Date.now()}`,
      nomeFamiliar: 'Familiar Convidado',
      grauParentesco: 'Familiar',
      papelAcesso: 'CUIDADOR',
      criadoEm: new Date().toISOString(),
      mensagem: 'Convite aceito com sucesso! Vínculo criado na Rede de Proteção de Dona Maria Silva.',
    };
  }
}

/**
 * Lista todos os convites pendentes de um idoso (HU-012/HU-013).
 */
export async function listarConvitesPendentes(idosoId, token = null) {
  try {
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/convites/pendentes`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      return [...convitesPendentesEmMemoria];
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) return data;
    return [...convitesPendentesEmMemoria];
  } catch (error) {
    return [...convitesPendentesEmMemoria];
  }
}

/**
 * Cancela um convite pendente.
 */
export async function cancelarConvite(idosoId, conviteId, token = null) {
  try {
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/convites/${conviteId}`, {
      method: 'DELETE',
      headers,
    });
  } catch (err) {
    console.warn('[redeProtecaoService] Falha ao cancelar convite no backend, atualizando localmente:', err.message);
  }
  convitesPendentesEmMemoria = convitesPendentesEmMemoria.filter((c) => c.id !== conviteId);
  return true;
}

/**
 * Edita dados de um convite pendente (email, papel, grau, mensagem).
 */
export async function editarConvite(idosoId, conviteId, novosDados, token = null) {
  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/convites/${conviteId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(novosDados),
    });
  } catch (err) {
    console.warn('[redeProtecaoService] Falha ao editar convite no backend, atualizando localmente:', err.message);
  }
  const idx = convitesPendentesEmMemoria.findIndex((c) => c.id === conviteId);
  if (idx !== -1) {
    convitesPendentesEmMemoria[idx] = {
      ...convitesPendentesEmMemoria[idx],
      emailDestinatario: novosDados.email || convitesPendentesEmMemoria[idx].emailDestinatario,
      grauParentescoSugerido: novosDados.grauParentesco || convitesPendentesEmMemoria[idx].grauParentescoSugerido,
      papelAcessoSugerido: novosDados.papelAcesso || convitesPendentesEmMemoria[idx].papelAcessoSugerido,
      papelLabel: novosDados.papelAcesso === 'ADMIN' ? 'Administrador' : novosDados.papelAcesso === 'OBSERVADOR' ? 'Observador' : 'Cuidador(a)',
      mensagemPersonalizada: novosDados.mensagemPersonalizada ?? convitesPendentesEmMemoria[idx].mensagemPersonalizada,
    };
    return convitesPendentesEmMemoria[idx];
  }
  return null;
}

/**
 * Obtém a contagem de médicos ativos/vinculados e convites pendentes conforme RN-012 (HU-016).
 * Regra RN-012: Limite máximo de até 2 médicos por idoso na rede de proteção.
 */
export async function obterContagemMedicos(idosoId) {
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
export async function gerarConviteMedico(idosoId, dadosMedico, options = {}) {
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

  const tokenSimulado = `med-${Math.random().toString(36).substring(2, 12)}`;
  const dataExpiracao = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const novoConvite = {
    id: `convite-med-${Date.now()}`,
    idosoId,
    nomeIdoso: 'Dona Maria Silva',
    nomeMedico: dadosMedico.nome.trim(),
    crm: dadosMedico.crm.trim().toUpperCase(),
    emailDestinatario,
    token: tokenSimulado,
    linkConvite: `seniorinsight://convite/${tokenSimulado}`,
    linkWeb: `https://seniorinsight.app/convite/${tokenSimulado}`,
    papelAcessoSugerido: 'MEDICO',
    papelLabel: 'Médico(a) de Referência',
    grauParentescoSugerido: 'Médico(a)',
    tipoMembro: 'MEDICO',
    mensagemPersonalizada: dadosMedico.mensagemPersonalizada || 'Convite para acompanhar os relatórios semanais e dados clínicos de Dona Maria no SeniorInsight.',
    status: 'PENDENTE',
    dataExpiracao,
    criadoEm: new Date().toISOString(),
    validadeHorasRestantes: 72,
    mensagemSimulacao: `Convite de 72h enviado para o Dr(a). ${dadosMedico.nome.trim()} (CRM ${dadosMedico.crm.trim().toUpperCase()}).`,
  };

  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/convites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: emailDestinatario,
        papelAcesso: 'MEDICO',
        grauParentesco: 'Médico(a)',
        nomeMedico: dadosMedico.nome.trim(),
        crm: dadosMedico.crm.trim().toUpperCase(),
        mensagemPersonalizada: novoConvite.mensagemPersonalizada,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const formatado = {
        ...novoConvite,
        ...data,
        nomeMedico: dadosMedico.nome.trim(),
        crm: dadosMedico.crm.trim().toUpperCase(),
        validadeHorasRestantes: 72,
      };
      convitesPendentesEmMemoria = [formatado, ...convitesPendentesEmMemoria.filter((c) => c.emailDestinatario !== emailDestinatario)];
      return formatado;
    }
  } catch (err) {
    console.warn('[redeProtecaoService] Erro ao comunicar com backend ao gerar convite médico, ativando fallback local:', err.message);
  }

  convitesPendentesEmMemoria = [novoConvite, ...convitesPendentesEmMemoria.filter((c) => c.emailDestinatario !== emailDestinatario)];
  return novoConvite;
}

/**
 * Marca um convite de médico como recusado (HU-017 Cenário 2).
 * Exibe a mensagem: "O médico recusou o convite"
 */
export async function recusarConvite(idosoId, conviteId, motivo = 'O médico recusou o convite') {
  const idx = convitesPendentesEmMemoria.findIndex((c) => c.id === conviteId || c.token === conviteId);
  if (idx !== -1) {
    convitesPendentesEmMemoria[idx] = {
      ...convitesPendentesEmMemoria[idx],
      status: 'RECUSADO',
      mensagemRecusa: motivo,
      recusadoEm: new Date().toISOString(),
    };
    return convitesPendentesEmMemoria[idx];
  }

  const mockRecusa = {
    id: conviteId || `conv-rec-${Date.now()}`,
    idosoId,
    status: 'RECUSADO',
    mensagemRecusa: motivo,
    nomeMedico: 'Dr. Convidado',
    crm: '000000/SP',
    emailDestinatario: 'medico@recusou.com',
    papelAcessoSugerido: 'MEDICO',
    tipoMembro: 'MEDICO',
    recusadoEm: new Date().toISOString(),
  };
  convitesPendentesEmMemoria = [mockRecusa, ...convitesPendentesEmMemoria];
  return mockRecusa;
}

/**
 * Descarta ou remove a notificação de convite recusado da visualização da família.
 */
export async function descartarConviteRecusado(idosoId, conviteId) {
  convitesPendentesEmMemoria = convitesPendentesEmMemoria.filter((c) => c.id !== conviteId);
  return true;
}



