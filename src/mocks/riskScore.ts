export interface ScoreBrutoMock {
  idosoId?: string;
  nomeIdoso?: string;
  score?: number;
  diasComDadosValidos?: number;
  coletadoEm?: string;
  fatores?: string[];
}

export const SCORE_BEM_ESTAR_MOCK: Record<string, ScoreBrutoMock> = {
  'e3b0c442-98fc-1c14-9afc-432100000001': {
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    nomeIdoso: 'Dona Maria',
    score: 18,
    diasComDadosValidos: 7,
    coletadoEm: '2026-11-06T14:30:00.000Z',
    fatores: [
      'Sinais dentro do normal de Dona Maria',
      'Nenhuma anomalia detectada nas últimas 6h',
    ],
  },
};
