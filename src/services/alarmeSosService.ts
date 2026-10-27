import { runtimeConfig } from '../config/runtime';

export interface AlarmeEmergencia {
  id: string;
  idempotencyKey?: string;
  idosoId?: string;
  latitude?: number | null;
  longitude?: number | null;
  nivelBateria?: number | null;
  observacao?: string;
  status: string;
  criadoEm?: string;
  atualizadoEm?: string;
  [key: string]: any;
}

export interface DispararSosPayload {
  latitude?: number | null;
  longitude?: number | null;
  nivelBateria?: number | null;
  observacao?: string;
  idempotencyKey?: string | null;
}

export interface AlarmeSosError extends Error {
  status?: number;
}

// Estado local para fallback resiliente / offline
let alarmesLocais: AlarmeEmergencia[] = [];

/**
 * Serviço de integração com o Botão de Alarme e SOS de Emergência (HU35).
 * Endpoints no backend-core:
 * - POST /api/v1/idosos/{idosoId}/sos (SLA < 100ms, HTTP 202 Accepted)
 * - PUT  /api/v1/sos/{alarmeId}/status
 * - GET  /api/v1/sos/{alarmeId}
 * - GET  /api/v1/idosos/{idosoId}/sos
 */

/**
 * Dispara o alarme de emergência SOS com localização e nível de bateria.
 * @param {string} idosoId
 * @param {object} dados - { latitude, longitude, nivelBateria, observacao }
 * @param {string|null} token
 * @returns {Promise<object>} AlarmeEmergenciaResponseDTO
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
  token: string | null = null
): Promise<AlarmeEmergencia> {
  const agora = new Date().toISOString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  const payload: Record<string, unknown> = {
    observacao,
  };
  if (latitude !== null && latitude !== undefined) payload.latitude = latitude;
  if (longitude !== null && longitude !== undefined) payload.longitude = longitude;
  if (nivelBateria !== null && nivelBateria !== undefined) payload.nivelBateria = nivelBateria;

  const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/sos`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (response.status === 202 || response.ok) {
    const data: AlarmeEmergencia = await response.json();
    alarmesLocais.unshift(data);
    return data;
  }

  const erroMsg = `Falha ao registrar alarme SOS (HTTP ${response.status})`;
  console.warn(`[alarmeSosService] ${erroMsg}`);
  const erro: AlarmeSosError = new Error(erroMsg);
  erro.status = response.status;
  throw erro;
}

export function registrarAlarmeLocalmente(alarme: AlarmeEmergencia): void {
  if (alarme) {
    alarmesLocais.unshift(alarme);
  }
}

/**
 * Atualiza o status do alarme (ex: EM_ATENDIMENTO, RESOLVIDO, CANCELADO).
 * @param {string} alarmeId
 * @param {string} novoStatus - 'EM_ATENDIMENTO' | 'RESOLVIDO' | 'CANCELADO'
 * @param {string} observacao
 * @param {string|null} token
 */
export async function atualizarStatusAlarme(
  alarmeId: string,
  novoStatus: string,
  observacao = '',
  token: string | null = null
): Promise<AlarmeEmergencia> {
  const agora = new Date().toISOString();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/sos/${alarmeId}/status`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        status: novoStatus,
        observacao,
      }),
    });

    if (response.ok) {
      const data: AlarmeEmergencia = await response.json();
      atualizarAlarmeLocal(alarmeId, novoStatus, observacao);
      return data;
    }

    console.warn(`[alarmeSosService] Falha ao atualizar status (${response.status}). Atualizando localmente.`);
    return atualizarAlarmeLocal(alarmeId, novoStatus, observacao);
  } catch (error: any) {
    console.warn('[alarmeSosService] Erro de rede ao atualizar status:', error?.message);
    return atualizarAlarmeLocal(alarmeId, novoStatus, observacao);
  }
}

/**
 * Consulta os detalhes de um alarme de emergência pelo ID.
 */
export async function obterAlarme(
  alarmeId: string,
  token: string | null = null
): Promise<AlarmeEmergencia | null> {
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/sos/${alarmeId}`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error: any) {
    console.warn('[alarmeSosService] Erro ao buscar alarme:', error?.message);
  }

  return alarmesLocais.find((a) => a.id === alarmeId) || null;
}

/**
 * Lista os alarmes de socorro disparados para o idoso especificado.
 */
export async function listarAlarmesIdoso(
  idosoId: string,
  token: string | null = null
): Promise<AlarmeEmergencia[]> {
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/sos`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        alarmesLocais = data;
        return data;
      }
    }
  } catch (error: any) {
    console.warn('[alarmeSosService] Erro ao listar alarmes:', error?.message);
  }

  return alarmesLocais.filter((a) => !idosoId || a.idosoId === idosoId);
}

function atualizarAlarmeLocal(
  alarmeId: string,
  novoStatus: string,
  observacao: string
): AlarmeEmergencia {
  const index = alarmesLocais.findIndex((a) => a.id === alarmeId);
  const agora = new Date().toISOString();
  if (index !== -1) {
    alarmesLocais[index] = {
      ...alarmesLocais[index],
      status: novoStatus,
      observacao: observacao || alarmesLocais[index].observacao,
      atualizadoEm: agora,
    };
    return alarmesLocais[index];
  }

  const fallback: AlarmeEmergencia = {
    id: alarmeId,
    status: novoStatus,
    observacao,
    atualizadoEm: agora,
  };
  alarmesLocais.push(fallback);
  return fallback;
}
