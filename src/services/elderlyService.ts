import { mockPermitido } from '../config/ambiente';
import type { IdosoApi, IdosoRequest } from '../types/api';
import { apiClient, type ApiClient } from './apiClient';
import { dataBrParaIso, isoParaDataBr } from './cadastroIdosoValidacao';
import { decodificarJwt, obterAccessTokenValido } from './authSession';

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
    // O contrato manda ISO (1946-05-10); as telas trabalham com DD/MM/AAAA.
    dataNascimento: isoParaDataBr(idoso.dataNascimento) ?? (idoso.dataNascimento || ''),
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

/** A sessão não traz o `sub` do familiar (token ausente, ilegível ou sem a claim). */
export class SessaoSemFamiliarError extends Error {
  constructor() {
    super('Não foi possível identificar sua conta. Entre de novo para ver seus idosos.');
    this.name = 'SessaoSemFamiliarError';
  }
}

/**
 * Idosos do familiar logado: GET /api/v1/familiares/{sub}/idosos, sempre com o `sub` do JWT da sessão
 * (DAS v2.1 §4.1: o care aceita o id interno ou o sub; o `perfil.id` do identity não é nenhum dos dois).
 * Home, Perfil do idoso e o seletor do header usam esta mesma função. Sem `sub` lança
 * `SessaoSemFamiliarError`; lista vazia fica vazia; erro da API é propagado. Com mock permitido (dev), erro
 * ou lista vazia caem nos idosos de demonstração.
 */
export async function listarIdososDoFamiliar({
  cliente = apiClient,
  obterToken = obterAccessTokenValido,
}: OpcoesRede & { obterToken?: () => Promise<string | null> } = {}): Promise<Idoso[]> {
  try {
    const sub = decodificarJwt(await obterToken().catch(() => null))?.sub?.trim();
    if (!sub) throw new SessaoSemFamiliarError();

    const data = await cliente.get<any[]>(`/api/v1/familiares/${encodeURIComponent(sub)}/idosos`);
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

/** Campos que a ficha do idoso deixa editar; o resto do cadastro é preservado no PUT. */
export interface EdicaoIdoso {
  nome: string;
  /** DD/MM/AAAA, como no formulário. */
  dataNascimento: string;
  sexo: string;
  tipoSanguineo: string | null;
}

/** Todos os campos do IdosoRequest (care-v1). O PUT do care substitui o cadastro inteiro. */
const CAMPOS_IDOSO_REQUEST = [
  'nomeCompleto',
  'dataNascimento',
  'genero',
  'cpf',
  'fotoPerfilUrl',
  'tipoSanguineo',
  'alergias',
  'logradouro',
  'numero',
  'bairro',
  'cidade',
  'estado',
  'cep',
  'planoSaude',
  'observacoesSocorros',
] as const satisfies readonly (keyof IdosoRequest)[];

/** Cadastro completo do idoso: GET /api/v1/idosos/{idosoId} (schema Idoso). Em erro lança. */
export async function obterIdoso(idosoId: string, { cliente = apiClient }: OpcoesRede = {}): Promise<IdosoApi> {
  try {
    return await cliente.get<IdosoApi>(`/api/v1/idosos/${encodeURIComponent(idosoId)}`);
  } catch (error: any) {
    const local = mockPermitido() ? obterIdosoLocalPorId(idosoId) : null;
    if (!local) throw error;
    console.warn('[elderlyService] Backend inacessível. Usando idoso de demonstração (mock):', error?.message);
    return {
      id: local.idosoId,
      nomeCompleto: local.nome,
      dataNascimento: dataBrParaIso(local.dataNascimento) ?? local.dataNascimento,
      genero: local.sexo || null,
      comorbidades: [],
      criadoEm: new Date(0).toISOString(),
      atualizadoEm: new Date(0).toISOString(),
    };
  }
}

/**
 * Corpo do PUT a partir do cadastro completo vindo da API: copia todos os campos do IdosoRequest e troca só
 * os editados na ficha. Assim CPF, alergias, endereço, plano de saúde etc. não são apagados.
 */
export function montarIdosoRequestAtualizado(atual: IdosoApi, edicao: EdicaoIdoso): IdosoRequest {
  const dataIso = dataBrParaIso(edicao.dataNascimento);
  if (!dataIso) throw new Error('Data de nascimento inválida. Use DD/MM/AAAA.');

  const base: Record<string, unknown> = {};
  for (const campo of CAMPOS_IDOSO_REQUEST) base[campo] = (atual as Record<string, unknown>)[campo] ?? null;

  return {
    ...(base as unknown as IdosoRequest),
    nomeCompleto: edicao.nome.trim(),
    dataNascimento: dataIso,
    genero: edicao.sexo || null,
    tipoSanguineo: edicao.tipoSanguineo?.trim() || null,
  };
}

/**
 * Atualiza o idoso: PUT /api/v1/idosos/{idosoId} com o IdosoRequest completo (ver montarIdosoRequestAtualizado).
 * Devolve o cadastro salvo. Em erro lança; só com mock permitido (dev) devolve a mescla local.
 */
export async function atualizarIdoso(
  atual: IdosoApi,
  edicao: EdicaoIdoso,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<IdosoApi> {
  const payload = montarIdosoRequestAtualizado(atual, edicao);
  let salvo: IdosoApi;
  try {
    salvo = await cliente.put<IdosoApi>(`/api/v1/idosos/${encodeURIComponent(atual.id)}`, payload);
  } catch (error: any) {
    if (!mockPermitido()) throw error;
    console.warn('[elderlyService] Backend inacessível. Atualizando idoso só no aparelho (mock):', error?.message);
    salvo = { ...atual, ...payload };
  }

  const normalizado = normalizarIdoso(salvo);
  localElderliesStore = localElderliesStore.map((idoso) => (idoso.idosoId === atual.id ? normalizado : idoso));
  return salvo;
}

export function obterIdosoLocalPorId(idosoId: string): Idoso | null {
  return localElderliesStore.find((idoso) => idoso.idosoId === idosoId) || null;
}

/** Exclusão da conta (HU-022): esquece os idosos guardados em memória. */
export function descartarIdososEmMemoria(): void {
  localElderliesStore = [];
}
