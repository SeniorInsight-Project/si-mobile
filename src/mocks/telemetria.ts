import type { EstadoAtualApi } from '../types/api';

export const IDOSO_DEMONSTRACAO = 'e3b0c442-98fc-1c14-9afc-432100000001';

/** Respostas de demonstração no formato do telemetry-v1; só valem com mock permitido (dev). */
export const ESTADO_ATUAL_MOCK: Record<string, EstadoAtualApi> = {
  [IDOSO_DEMONSTRACAO]: {
    idosoId: IDOSO_DEMONSTRACAO,
    passosHoje: 4520,
    metaPassos: 4000,
    frequenciaCardiaca: 76,
    frequenciaCardiacaRepouso: 64,
    coletadoEm: '2026-11-06T14:30:00.000Z',
  },
};
