export interface ContatoEmergenciaMock {
  id: string;
  nome: string;
  parentesco: string;
  telefone: string;
  ordem: number;
  whatsapp: boolean;
  iniciais: string;
  corAvatar: string;
  corTexto: string;
  ativo: boolean;
}

export const CONTATOS_EMERGENCIA_PADRAO: ContatoEmergenciaMock[] = [
  {
    id: 'contato-1',
    nome: 'Carlos Silva',
    parentesco: 'Filho (Cuidador Principal)',
    telefone: '(11) 98765-4321',
    ordem: 1,
    whatsapp: true,
    iniciais: 'CA',
    corAvatar: '#EBF5FF',
    corTexto: '#1E40AF',
    ativo: true,
  },
  {
    id: 'contato-2',
    nome: 'Roberta Santos',
    parentesco: 'Filha',
    telefone: '(11) 97654-3210',
    ordem: 2,
    whatsapp: true,
    iniciais: 'RO',
    corAvatar: '#E6F4EA',
    corTexto: '#137333',
    ativo: true,
  },
  {
    id: 'contato-3',
    nome: 'Dr. Ricardo Silva',
    parentesco: 'Médico Cardiologista',
    telefone: '(11) 93456-7890',
    ordem: 3,
    whatsapp: true,
    iniciais: 'DR',
    corAvatar: '#F3E8FF',
    corTexto: '#6B21A8',
    ativo: true,
  },
];
