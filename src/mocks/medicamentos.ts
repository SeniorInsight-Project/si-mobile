export interface RotinaMedicamentoMock {
  id: string;
  idosoId: string;
  idosoNome: string;
  medicamentoId: string;
  medicamentoNome: string;
  nomeMedicamento?: string;
  dosagem: string;
  instrucoes: string;
  horario: string;
  frequencia: string;
  diasSemana: string;
  tipoFormato: 'comprimido' | 'gotas' | 'xarope' | 'outro';
  ativo: boolean;
  statusHoje: 'TOMADO' | 'PENDENTE' | 'ATRASADO';
  horarioIngestaoHoje: string | null;
  isProximo: boolean;
  iconeTipo: 'check' | 'clock' | 'sun' | 'moon';
  corIcone: string;
  corFundoThumb: string;
  thumbEmoji: string;
}

export const INITIAL_MEDICINES: RotinaMedicamentoMock[] = [
  {
    id: 'med-rotina-001',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-001',
    medicamentoNome: 'Losartana 50mg',
    nomeMedicamento: 'Losartana 50mg',
    dosagem: '1 comprimido • Uso contínuo',
    instrucoes: 'Tomar com 1 copo de água',
    horario: '08:00',
    frequencia: '1x ao dia (Diário)',
    diasSemana: 'TODOS',
    tipoFormato: 'comprimido',
    ativo: true,
    statusHoje: 'TOMADO',
    horarioIngestaoHoje: '08:05',
    isProximo: false,
    iconeTipo: 'check',
    corIcone: '#10B981',
    corFundoThumb: '#E8F8F0',
    thumbEmoji: '💊',
  },
  {
    id: 'med-rotina-002',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-002',
    medicamentoNome: 'Vitamina D3',
    nomeMedicamento: 'Vitamina D3',
    dosagem: '2.000 UI • 1 cápsula gelatinosa',
    instrucoes: 'Junto ao café da manhã',
    horario: '10:00',
    frequencia: '1x ao dia (Diário)',
    diasSemana: 'TODOS',
    tipoFormato: 'comprimido',
    ativo: true,
    statusHoje: 'PENDENTE',
    horarioIngestaoHoje: null,
    isProximo: true,
    iconeTipo: 'clock',
    corIcone: '#F59E0B',
    corFundoThumb: '#EBF5FF',
    thumbEmoji: '💊',
  },
  {
    id: 'med-rotina-003',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-003',
    medicamentoNome: 'Metformina 850mg',
    nomeMedicamento: 'Metformina 850mg',
    dosagem: '1 comprimido • Controle glicêmico',
    instrucoes: 'Logo após o almoço',
    horario: '14:00',
    frequencia: '1x ao dia (Diário)',
    diasSemana: 'TODOS',
    tipoFormato: 'xarope',
    ativo: true,
    statusHoje: 'PENDENTE',
    horarioIngestaoHoje: null,
    isProximo: false,
    iconeTipo: 'sun',
    corIcone: '#9A3412',
    corFundoThumb: '#FFF1EC',
    thumbEmoji: '🧴',
  },
  {
    id: 'med-rotina-004',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-004',
    medicamentoNome: 'Sinvastatina 20mg',
    nomeMedicamento: 'Sinvastatina 20mg',
    dosagem: '1 comprimido • Uso noturno',
    instrucoes: 'Antes de dormir',
    horario: '20:00',
    frequencia: '1x ao dia (Diário)',
    diasSemana: 'TODOS',
    tipoFormato: 'gotas',
    ativo: true,
    statusHoje: 'PENDENTE',
    horarioIngestaoHoje: null,
    isProximo: false,
    iconeTipo: 'moon',
    corIcone: '#5B21B6',
    corFundoThumb: '#F3EEFF',
    thumbEmoji: '💧',
  },
];
