import type { StatusAparelhoApi } from '../types/api';
import { IDOSO_DEMONSTRACAO } from './telemetria';

/** Respostas de demonstração no formato do telemetry-v1; só valem com mock permitido (dev). */
export const STATUS_DISPOSITIVO_MOCK: Record<string, StatusAparelhoApi> = {
  [IDOSO_DEMONSTRACAO]: {
    idosoId: IDOSO_DEMONSTRACAO,
    ultimaSincronizacao: '2026-11-06T10:15:00.000Z',
    nivelBateria: 62,
    versaoApp: '1.0.4',
    modeloCelular: 'Samsung Galaxy A15',
    sistemaOperacional: 'Android 14',
    tiposAtivos: ['PASSOS', 'BATIMENTOS', 'LOCALIZACAO'],
  },
};
