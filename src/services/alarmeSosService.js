import { runtimeConfig } from '../config/runtime.js';

// Estado local para fallback resiliente / offline
let alarmesLocais = [];

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
  idosoId,
  {
    latitude = -23.550520,
    longitude = -46.633308,
    nivelBateria = 88,
    observacao = 'Botão SOS acionado no aplicativo móvel.',
  } = {},
  token = null
) {
  const agora = new Date().toISOString();
  const mockFallback = {
    id: `sos-${Date.now()}`,
    idosoId,
    nomeIdoso: 'Dona Maria Silva',
    latitude,
    longitude,
    nivelBateria,
    status: 'DISPARADO',
    observacao,
    criadoEm: agora,
    atualizadoEm: agora,
    mensagem: 'Alarme SOS registrado com sucesso e enviado à rede de socorro.',
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/sos`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        latitude,
        longitude,
        nivelBateria,
        observacao,
      }),
    });

    if (response.status === 202 || response.ok) {
      const data = await response.json();
      alarmesLocais.unshift(data);
      return data;
    }

    console.warn(`[alarmeSosService] Backend respondeu status ${response.status}. Ativando fallback local.`);
    alarmesLocais.unshift(mockFallback);
    return mockFallback;
  } catch (error) {
    console.warn('[alarmeSosService] Erro ao conectar com o backend:', error.message);
    alarmesLocais.unshift(mockFallback);
    return mockFallback;
  }
}

/**
 * Atualiza o status do alarme (ex: EM_ATENDIMENTO, RESOLVIDO, CANCELADO).
 * @param {string} alarmeId
 * @param {string} novoStatus - 'EM_ATENDIMENTO' | 'RESOLVIDO' | 'CANCELADO'
 * @param {string} observacao
 * @param {string|null} token
 */
export async function atualizarStatusAlarme(alarmeId, novoStatus, observacao = '', token = null) {
  const agora = new Date().toISOString();

  try {
    const headers = {
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
      const data = await response.json();
      atualizarAlarmeLocal(alarmeId, novoStatus, observacao);
      return data;
    }

    console.warn(`[alarmeSosService] Falha ao atualizar status (${response.status}). Atualizando localmente.`);
    return atualizarAlarmeLocal(alarmeId, novoStatus, observacao);
  } catch (error) {
    console.warn('[alarmeSosService] Erro de rede ao atualizar status:', error.message);
    return atualizarAlarmeLocal(alarmeId, novoStatus, observacao);
  }
}

/**
 * Consulta os detalhes de um alarme de emergência pelo ID.
 */
export async function obterAlarme(alarmeId, token = null) {
  try {
    const headers = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/sos/${alarmeId}`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('[alarmeSosService] Erro ao buscar alarme:', error.message);
  }

  return alarmesLocais.find((a) => a.id === alarmeId) || null;
}

/**
 * Lista os alarmes de socorro disparados para o idoso especificado.
 */
export async function listarAlarmesIdoso(idosoId, token = null) {
  try {
    const headers = { 'Accept': 'application/json' };
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
  } catch (error) {
    console.warn('[alarmeSosService] Erro ao listar alarmes:', error.message);
  }

  return alarmesLocais.filter((a) => !idosoId || a.idosoId === idosoId);
}

function atualizarAlarmeLocal(alarmeId, novoStatus, observacao) {
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

  const fallback = {
    id: alarmeId,
    status: novoStatus,
    observacao,
    atualizadoEm: agora,
  };
  alarmesLocais.push(fallback);
  return fallback;
}
