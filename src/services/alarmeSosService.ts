import type { AlarmeEmergenciaApi, DispararSosRequest, StatusAlarme } from '../types/api';
import { apiClient, type ApiClient } from './apiClient';
import {
  atualizarStatusChamado,
  buscarAlarme,
  buscarAlarmeAtivo,
  type AlarmeRecebido,
  type OpcoesRede,
} from './sosRecebidoService';

/** Alarme do contrato care-v1 mais o que o app guarda na fila offline (idempotencyKey, campos opcionais). */
export interface AlarmeEmergencia extends Partial<Omit<AlarmeEmergenciaApi, 'status'>> {
  id: string;
  idempotencyKey?: string;
  /** StatusAlarme do contrato; string porque a fila offline também grava aqui. */
  status: string;
  [key: string]: any;
}

/** Corpo de DispararSosRequest; null é aceito aqui e o campo não vai na requisição. */
export interface DispararSosPayload extends Omit<DispararSosRequest, 'latitude' | 'longitude' | 'nivelBateria'> {
  latitude?: number | null;
  longitude?: number | null;
  nivelBateria?: number | null;
  idempotencyKey?: string | null;
}

/**
 * Botão de SOS do idoso (HU35), pelo contrato care-v1:
 * - POST /api/v1/idosos/{idosoId}/sos (202 Accepted), com Idempotency-Key.
 *
 * Consultar e mudar o estado do chamado é do sosRecebidoService (GET /api/v1/sos/{id},
 * GET /api/v1/idosos/{id}/sos e PUT /api/v1/sos/{id}/status): aqui só se delega. O estado é sempre o do servidor;
 * em erro as funções lançam, sem guardar alarme local.
 */

/**
 * Dispara o alarme de emergência SOS com localização e nível de bateria.
 * Em erro lança ApiError (status 0 sem rede); a fila offline (sosQueueService) reenvia com a mesma chave.
 */
export async function dispararSos(
  idosoId: string,
  {
    latitude = null,
    longitude = null,
    nivelBateria = null,
    observacao = 'Botão SOS acionado no aplicativo móvel.',
    idempotencyKey = null,
  }: DispararSosPayload = {},
  { cliente = apiClient }: { cliente?: Pick<ApiClient, 'post'> } = {}
): Promise<AlarmeEmergencia> {
  const corpo: DispararSosRequest = { observacao };
  if (latitude !== null && latitude !== undefined) corpo.latitude = latitude;
  if (longitude !== null && longitude !== undefined) corpo.longitude = longitude;
  if (nivelBateria !== null && nivelBateria !== undefined) corpo.nivelBateria = nivelBateria;

  return cliente.post<AlarmeEmergenciaApi>(`/api/v1/idosos/${idosoId}/sos`, corpo, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
}

/** Muda o estado do alarme (EM_ATENDIMENTO, RESOLVIDO ou CANCELADO) no servidor. */
export function atualizarStatusAlarme(
  alarmeId: string,
  novoStatus: StatusAlarme,
  observacao = '',
  opcoes: OpcoesRede = {}
): Promise<AlarmeRecebido> {
  return atualizarStatusChamado(alarmeId, novoStatus, observacao, opcoes);
}

/** Consulta um alarme pelo id (lança SosError se não achar ou sem rede). */
export const obterAlarme = buscarAlarme;

/** O chamado em aberto do idoso, ou null se não há. */
export const obterAlarmeAtivo = buscarAlarmeAtivo;
