import { runtimeConfig } from '../config/runtime';

// Lista inicial padrão baseada no prontuário do Figma/Template para fallback resiliente em dev
export const INITIAL_COMORBIDITIES: string[] = [
  'Hipertensão Arterial',
  'Diabetes Tipo 2',
  'Osteoporose Leve',
  'Alergia a Dipirona',
];

export interface ComorbidadesResponse {
  idosoId: string;
  comorbidades: string[];
}

/**
 * Serviço de integração com os endpoints de comorbidades do backend-core (HU15).
 * Rota base: /api/v1/idosos/{idosoId}/comorbidades
 */
export async function listarComorbidades(
  idosoId: string,
  token: string | null = null
): Promise<ComorbidadesResponse> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/comorbidades`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.warn(`[comorbidadeService] Falha ao listar comorbidades (${response.status}). Usando fallback local.`);
      return { idosoId, comorbidades: INITIAL_COMORBIDITIES };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.warn('[comorbidadeService] Backend inacessível. Ativando fallback resiliente:', error?.message);
    return { idosoId, comorbidades: INITIAL_COMORBIDITIES };
  }
}

/**
 * Adiciona uma ou mais comorbidades ao perfil do idoso via POST.
 * Payload esperado: { "comorbidades": ["Nome da Patologia"] }
 */
export async function adicionarComorbidades(
  idosoId: string,
  novasComorbidades: string | string[],
  token: string | null = null
): Promise<any> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/comorbidades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        comorbidades: Array.isArray(novasComorbidades) ? novasComorbidades : [novasComorbidades],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status} ao adicionar comorbidade.`);
    }

    return await response.json();
  } catch (error: any) {
    console.warn('[comorbidadeService] Aviso ao adicionar comorbidade:', error?.message);
    throw error;
  }
}

/**
 * Remove uma comorbidade específica do perfil do idoso via DELETE.
 * Endpoint: DELETE /api/v1/idosos/{idosoId}/comorbidades/{nomeComorbidade}
 */
export async function removerComorbidade(
  idosoId: string,
  nomeComorbidade: string,
  token: string | null = null
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const encodedNome = encodeURIComponent(nomeComorbidade);
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/comorbidades/${encodedNome}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status} ao remover comorbidade.`);
    }

    return true;
  } catch (error: any) {
    console.warn('[comorbidadeService] Aviso ao remover comorbidade:', error?.message);
    throw error;
  }
}
