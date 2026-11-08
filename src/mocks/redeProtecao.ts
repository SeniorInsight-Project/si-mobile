export interface MembroRedeMock {
  id: string;
  vinculoId: string;
  usuarioId: string;
  nome: string;
  nomeCompleto: string;
  iniciais: string;
  avatarBg: string;
  avatarCor: string;
  badgeBg: string;
  badgeCor: string;
  acoes: string[];
  verificado: boolean;
  grauParentesco: string;
  papelAcesso: string;
  papelLabel: string;
  badgeTipo: 'plantao' | 'familia' | 'apoio' | 'especialista';
  badgeTexto: string;
  statusConexao: 'ONLINE' | 'BUSY' | 'AWAY' | 'VERIFIED';
  statusLabel: string;
  statusIcone: string;
  telefone: string;
  email: string;
  avatarUrl: string;
  distanciaKm: number;
  acoesTexto: string;
  isPlantao: boolean;
  categoria: 'todos' | 'proximos' | 'saude';
  historicoRecente: Array<{ data: string; descricao: string }>;
}

export interface ConvitePendenteMock {
  id: string;
  idosoId: string;
  nomeIdoso: string;
  emailDestinatario: string;
  papelAcessoSugerido: string;
  papelLabel: string;
  grauParentescoSugerido: string;
  mensagemPersonalizada: string;
  token: string;
  linkConvite: string;
  status: string;
  criadoEm: string;
  dataExpiracao?: string;
  validadeHorasRestantes: number;
  nomeMedico?: string;
  crm?: string;
  tipoMembro?: string;
  mensagemRecusa?: string;
  recusadoEm?: string;
}

export const INITIAL_MEMBERS: MembroRedeMock[] = [
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
    badgeTipo: 'plantao',
    badgeTexto: '★ Plantão',
    statusConexao: 'ONLINE',
    statusLabel: 'Disponível • Próximo (1.2 km)',
    statusIcone: 'location',
    telefone: '+55 11 98765-4321',
    email: 'carlos.silva@seniorinsight.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    distanciaKm: 1.2,
    acoesTexto: 'Ações de emergência:',
    isPlantao: true,
    categoria: 'proximos',
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

export const CONVITES_PENDENTES_INICIAIS: ConvitePendenteMock[] = [
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
    criadoEm: '2026-11-06T12:00:00.000Z',
    dataExpiracao: '2026-11-08T12:00:00.000Z',
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
    criadoEm: '2026-11-05T10:00:00.000Z',
    recusadoEm: '2026-11-06T08:00:00.000Z',
    validadeHorasRestantes: 48,
  },
];
