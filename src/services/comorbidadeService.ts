import type { ComorbidadeRequest, Comorbidades } from '../types/api';
import { apiClient, type ApiClient } from './apiClient';

/** Comorbidades do contrato care-v1. */
export type ComorbidadesResponse = Comorbidades;

export interface OpcoesRede {
  cliente?: Pick<ApiClient, 'get' | 'post' | 'delete'>;
}

/**
 * Comorbidades do idoso pelo contrato care-v1 (HU15), via apiClient (renova o token e repete após 401).
 * Rota base: /api/v1/idosos/{idosoId}/comorbidades
 *
 * Em qualquer erro (rede, 401, 403, 404, 5xx) as funções lançam ApiError: a tela mostra a falha em vez de
 * dados inventados.
 */
export async function listarComorbidades(
  idosoId: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<ComorbidadesResponse> {
  return cliente.get<ComorbidadesResponse>(`/api/v1/idosos/${idosoId}/comorbidades`);
}

/**
 * Adiciona uma ou mais comorbidades ao perfil do idoso.
 * Corpo: ComorbidadeRequest ({ comorbidades: string[] }); a resposta é a lista atualizada.
 */
export async function adicionarComorbidades(
  idosoId: string,
  novasComorbidades: string | string[],
  { cliente = apiClient }: OpcoesRede = {}
): Promise<ComorbidadesResponse> {
  const corpo = {
    comorbidades: Array.isArray(novasComorbidades) ? novasComorbidades : [novasComorbidades],
  } satisfies ComorbidadeRequest;
  return cliente.post<ComorbidadesResponse>(`/api/v1/idosos/${idosoId}/comorbidades`, corpo);
}

/**
 * Remove uma comorbidade do perfil do idoso.
 * Rota: DELETE /api/v1/idosos/{idosoId}/comorbidades/{nomeComorbidade} (204).
 */
export async function removerComorbidade(
  idosoId: string,
  nomeComorbidade: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<boolean> {
  await cliente.delete(`/api/v1/idosos/${idosoId}/comorbidades/${encodeURIComponent(nomeComorbidade)}`);
  return true;
}
