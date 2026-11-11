import { mockPermitido } from '../config/ambiente';
import type { IdosoRequest } from '../types/api';
import { apiClient, type ApiClient } from './apiClient';
import { dataBrParaIso } from './cadastroIdosoValidacao';

export interface OpcoesRede {
  cliente?: Pick<ApiClient, 'get' | 'post' | 'put'>;
}

const PREFIXO_ID_LOCAL = 'idoso-local-';

/**
 * Id do idoso só quando ele veio do servidor: o id gerado no aparelho (cadastro local, só em dev com mock)
 * não existe no care-service e não deve ir em requisições como o código de pareamento.
 */
export function idosoIdDoServidor(idosoId?: string | null): string | null {
  const id = idosoId?.trim();
  return id && !id.startsWith(PREFIXO_ID_LOCAL) ? id : null;
}

export interface Idoso {
  idosoId: string;
  nome: string;
  dataNascimento: string;
  sexo: string;
  celular: string;
}

export type ElderlyProfile = Idoso;

export interface CadastroIdosoInput {
  idosoId?: string;
  nome: string;
  dataNascimento: string;
  sexo: string;
  celular: string;
}

let localElderliesStore: Idoso[] = [];

async function garantirIdososIniciais(): Promise<void> {
  if (localElderliesStore.length === 0 && mockPermitido()) {
    const { INITIAL_ELDERLIES } = await import('../mocks/idosos');
    localElderliesStore = [...(INITIAL_ELDERLIES as unknown as Idoso[])];
  }
}

function normalizarIdoso(idoso: any): Idoso {
  return {
    idosoId: idoso.idosoId || idoso.id || `${PREFIXO_ID_LOCAL}${Date.now()}`,
    nome: idoso.nome || idoso.nomeCompleto || '',
    dataNascimento: idoso.dataNascimento || '',
    sexo: idoso.sexo || idoso.genero || '',
    celular: idoso.celular || idoso.telefone || '',
  };
}

/**
 * Corpo do POST/PUT /api/v1/idosos pelo contrato care-v1 (IdosoRequest): nomeCompleto, data ISO e genero.
 * O celular não tem campo no contrato e fica só no aparelho.
 */
function paraIdosoRequest(dados: CadastroIdosoInput): IdosoRequest {
  return {
    nomeCompleto: dados.nome.trim(),
    dataNascimento: dataBrParaIso(dados.dataNascimento) ?? dados.dataNascimento,
    genero: dados.sexo || null,
  };
}

/**
 * Idosos do familiar: GET /api/v1/familiares/{familiarId}/idosos. Lista vazia fica vazia; em erro lança
 * (a tela mostra a falha). Com mock permitido (dev), erro ou lista vazia caem nos idosos de demonstração.
 */
export async function listarIdososDoFamiliar(
  familiarId = 'familiar-dev',
  { cliente = apiClient }: OpcoesRede = {}
): Promise<Idoso[]> {
  try {
    const data = await cliente.get<any[]>(`/api/v1/familiares/${familiarId}/idosos`);
    if (Array.isArray(data) && data.length > 0) {
      localElderliesStore = data.map(normalizarIdoso);
      return [...localElderliesStore];
    }
    if (mockPermitido()) {
      await garantirIdososIniciais();
      return [...localElderliesStore];
    }
    localElderliesStore = [];
    return [];
  } catch (error: any) {
    if (!mockPermitido()) throw error;
    console.warn('[elderlyService] Backend inacessível. Usando idosos de demonstração (mock):', error?.message);
    await garantirIdososIniciais();
    return [...localElderliesStore];
  }
}

/**
 * Cadastra o idoso: POST /api/v1/idosos (IdosoRequest). Em erro lança; só com mock permitido (dev) salva no
 * aparelho com id local.
 */
export async function salvarCadastroIdoso(
  dadosIdoso: CadastroIdosoInput,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<Idoso> {
  const payload = paraIdosoRequest(dadosIdoso);

  try {
    const criado = normalizarIdoso(await cliente.post<any>('/api/v1/idosos', payload));
    localElderliesStore = [
      criado,
      ...localElderliesStore.filter((idoso) => idoso.idosoId !== criado.idosoId),
    ];
    return criado;
  } catch (error: any) {
    if (!mockPermitido()) throw error;
    console.warn('[elderlyService] Backend inacessível. Salvando idoso só no aparelho (mock):', error?.message);
  }

  const novoIdoso: Idoso = {
    idosoId: dadosIdoso.idosoId || `${PREFIXO_ID_LOCAL}${Date.now()}`,
    nome: dadosIdoso.nome,
    dataNascimento: dadosIdoso.dataNascimento,
    sexo: dadosIdoso.sexo,
    celular: dadosIdoso.celular,
  };

  localElderliesStore = [
    novoIdoso,
    ...localElderliesStore.filter((idoso) => idoso.idosoId !== novoIdoso.idosoId),
  ];

  return novoIdoso;
}

/**
 * Atualiza o idoso: PUT /api/v1/idosos/{idosoId} (IdosoRequest). Em erro lança; só com mock permitido (dev)
 * atualiza no aparelho.
 */
export async function atualizarDadosIdoso(
  idosoId: string,
  dadosIdoso: CadastroIdosoInput,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<Idoso> {
  const payload = paraIdosoRequest(dadosIdoso);

  try {
    const atualizado = normalizarIdoso(await cliente.put<any>(`/api/v1/idosos/${idosoId}`, payload));
    localElderliesStore = localElderliesStore.map((idoso) =>
      idoso.idosoId === idosoId ? atualizado : idoso
    );
    return atualizado;
  } catch (error: any) {
    if (!mockPermitido()) throw error;
    console.warn('[elderlyService] Backend inacessível. Atualizando idoso só no aparelho (mock):', error?.message);
  }

  const atualizadoLocal: Idoso = {
    idosoId,
    nome: dadosIdoso.nome,
    dataNascimento: dadosIdoso.dataNascimento,
    sexo: dadosIdoso.sexo,
    celular: dadosIdoso.celular,
  };

  localElderliesStore = localElderliesStore.map((idoso) =>
    idoso.idosoId === idosoId ? atualizadoLocal : idoso
  );

  return atualizadoLocal;
}

export function obterIdosoLocalPorId(idosoId: string): Idoso | null {
  return localElderliesStore.find((idoso) => idoso.idosoId === idosoId) || null;
}
