export interface EstadoAtualBrutoMock {
  idosoId: string;
  nomeIdoso?: string;
  passosHoje?: number | null;
  metaPassos?: number;
  frequenciaCardiaca?: number | null;
  frequenciaCardiacaRepouso?: number | null;
  statusCardiovascular?: string;
  coletadoEm?: string | null;
}

export const ESTADO_ATUAL_MOCK: Record<string, EstadoAtualBrutoMock> = {
  'e3b0c442-98fc-1c14-9afc-432100000001': {
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nomeIdoso: 'Dona Maria',
    passosHoje: 4520,
    metaPassos: 4000,
    frequenciaCardiaca: 76,
    frequenciaCardiacaRepouso: 64,
    statusCardiovascular: 'Estável',
    coletadoEm: '2026-11-06T14:30:00.000Z',
  },
};
