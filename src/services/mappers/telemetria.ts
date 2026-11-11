import type { EstadoAtualApi, StatusAparelhoApi, TipoDadoTelemetry } from '../../types/api';

/**
 * Camada anticorrupção do contexto de telemetria: traduz EstadoAtual e StatusAparelho do telemetry-v1
 * para o modelo do app. Campo que o servidor não manda (ou manda null) fica ausente no modelo;
 * a tela decide o que mostrar.
 */
export interface EstadoAtualLido {
  idosoId: string;
  /** null quando PASSOS não está autorizado pelo idoso. */
  passosHoje: number | null;
  metaPassos?: number;
  /** De 0 a 1; null quando não há passos ou meta para comparar. */
  progressoPassos: number | null;
  /** null quando BATIMENTOS não está autorizado pelo idoso. */
  frequenciaCardiaca: number | null;
  frequenciaCardiacaRepouso?: number;
  /** ISO da última leitura; null enquanto não chegou dado. */
  coletadoEm: string | null;
}

export interface SensorDispositivo {
  tipo: TipoDadoTelemetry;
  nome: string;
  ativo: boolean;
}

export interface StatusDispositivoLido {
  idosoId: string;
  ultimaSincronizacao: string | null;
  nivelBateria?: number;
  versaoApp?: string;
  modeloCelular?: string;
  sistemaOperacional?: string;
  sensores: SensorDispositivo[];
}

/** Os cinco tipos de dado do contrato, com o nome mostrado ao familiar. */
export const SENSORES_DO_CONTRATO: readonly { tipo: TipoDadoTelemetry; nome: string }[] = [
  { tipo: 'PASSOS', nome: 'Passos e movimentação' },
  { tipo: 'BATIMENTOS', nome: 'Frequência cardíaca' },
  { tipo: 'SONO', nome: 'Sono' },
  { tipo: 'OXIGENACAO', nome: 'Oxigenação (SpO2)' },
  { tipo: 'LOCALIZACAO', nome: 'Localização' },
];

const numeroOuNulo = (valor: unknown): number | null => (typeof valor === 'number' ? valor : null);
const numeroOuAusente = (valor: unknown): number | undefined => (typeof valor === 'number' ? valor : undefined);
const textoOuAusente = (valor: unknown): string | undefined => (typeof valor === 'string' ? valor : undefined);

function calcularProgresso(passos: number | null, meta: number | undefined): number | null {
  if (passos === null || meta === undefined || meta <= 0) return null;
  return Math.min(1, passos / meta);
}

export function estadoAtualDoContrato(dto: EstadoAtualApi): EstadoAtualLido {
  const passosHoje = numeroOuNulo(dto.passosHoje);
  const metaPassos = numeroOuAusente(dto.metaPassos);
  return {
    idosoId: dto.idosoId,
    passosHoje,
    metaPassos,
    progressoPassos: calcularProgresso(passosHoje, metaPassos),
    frequenciaCardiaca: numeroOuNulo(dto.frequenciaCardiaca),
    frequenciaCardiacaRepouso: numeroOuAusente(dto.frequenciaCardiacaRepouso),
    coletadoEm: textoOuAusente(dto.coletadoEm) ?? null,
  };
}

export function statusDoContrato(dto: StatusAparelhoApi): StatusDispositivoLido {
  const ativos = new Set<TipoDadoTelemetry>(Array.isArray(dto.tiposAtivos) ? dto.tiposAtivos : []);
  return {
    idosoId: dto.idosoId,
    ultimaSincronizacao: textoOuAusente(dto.ultimaSincronizacao) ?? null,
    nivelBateria: numeroOuAusente(dto.nivelBateria),
    versaoApp: textoOuAusente(dto.versaoApp),
    modeloCelular: textoOuAusente(dto.modeloCelular),
    sistemaOperacional: textoOuAusente(dto.sistemaOperacional),
    sensores: SENSORES_DO_CONTRATO.map(({ tipo, nome }) => ({ tipo, nome, ativo: ativos.has(tipo) })),
  };
}
