import { ApiError, type ApiClient } from './apiClient';

/**
 * Acesso ao telemetry-v1 pelo gateway: /api/v1/telemetry/** vira /v1/** no telemetry-service.
 * Só leitura; qualquer falha sobe como TelemetriaError, nunca como dado de exemplo.
 */
export const TIMEOUT_TELEMETRIA_MS = 4000;

export type CodigoErroTelemetria = 'SEM_IDOSO' | 'SEM_INTERNET' | 'FALHA';

export class TelemetriaError extends Error {
  readonly codigo: CodigoErroTelemetria;
  /** Status HTTP da resposta, quando houve resposta. */
  readonly status?: number;

  constructor(mensagem: string, codigo: CodigoErroTelemetria, status?: number) {
    super(mensagem);
    this.name = 'TelemetriaError';
    this.codigo = codigo;
    this.status = status;
  }
}

export type ClienteTelemetria = Pick<ApiClient, 'get'>;

export function rotaEstadoAtual(idosoId: string): string {
  return `/api/v1/telemetry/idosos/${idosoId}/hoje`;
}

export function rotaStatusAparelho(idosoId: string): string {
  return `/api/v1/telemetry/idosos/${idosoId}/status`;
}

export function exigirIdoso(idosoId: string | null | undefined): string {
  if (!idosoId) throw new TelemetriaError('Idoso não informado.', 'SEM_IDOSO');
  return idosoId;
}

function traduzir(erro: unknown, falha: string): TelemetriaError {
  if (erro instanceof ApiError) {
    if (erro.erroDeRede) return new TelemetriaError('Sem internet. Conecte-se e tente de novo.', 'SEM_INTERNET', erro.status);
    return new TelemetriaError(falha, 'FALHA', erro.status);
  }
  return new TelemetriaError(falha, 'FALHA');
}

/** GET com limite de tempo; qualquer erro vira TelemetriaError com a mensagem `falha`. */
export async function lerTelemetria<T>(cliente: ClienteTelemetria, caminho: string, falha: string): Promise<T> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_TELEMETRIA_MS);
  try {
    return await cliente.get<T>(caminho, { signal: controlador.signal });
  } catch (erro) {
    throw traduzir(erro, falha);
  } finally {
    clearTimeout(temporizador);
  }
}

