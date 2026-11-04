/**
 * Cliente HTTP único do app para o si-api-gateway.
 *
 * - Monta a URL a partir de runtimeConfig.apiBaseUrl.
 * - Envia Authorization: Bearer com um access token válido (renovado antes de vencer).
 * - Se o gateway responder 401, renova o token uma vez e repete a requisição.
 * - Erros saem como ApiError (status + corpo); falha de rede vira status 0.
 */
import { runtimeConfig } from '../config/runtime';
import { obterAccessTokenValido, renovarSessao, SessaoInvalidaError } from './authSession';

export class ApiError extends Error {
  readonly status: number;
  readonly corpo: unknown;
  readonly url: string;

  constructor(status: number, corpo: unknown, url: string, message?: string) {
    super(message ?? mensagemPadrao(status, corpo));
    this.name = 'ApiError';
    this.status = status;
    this.corpo = corpo;
    this.url = url;
  }

  /** Falha antes de qualquer resposta (sem rede, DNS, timeout). */
  get erroDeRede(): boolean {
    return this.status === 0;
  }
}

function mensagemPadrao(status: number, corpo: unknown): string {
  if (status === 0) return 'Não foi possível falar com o servidor. Verifique sua conexão.';
  const c = corpo as { mensagem?: unknown; message?: unknown } | null;
  if (c && typeof c.mensagem === 'string') return c.mensagem;
  if (c && typeof c.message === 'string') return c.message;
  return `Erro HTTP ${status}`;
}

export type MetodoHttp = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OpcoesRequisicao {
  method?: MetodoHttp;
  /** Objetos são enviados como JSON; string e FormData vão como estão. */
  body?: unknown;
  headers?: Record<string, string>;
  /** false para rotas públicas (não envia token nem tenta renovar). Padrão: true. */
  autenticado?: boolean;
  signal?: AbortSignal;
}

export interface DependenciasApiClient {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Token a enviar (já renovado se estava para vencer), ou null sem sessão. */
  obterToken?: () => Promise<string | null>;
  /** Força a renovação após um 401; null quando a sessão não pode ser renovada. */
  renovarToken?: () => Promise<string | null>;
}

async function renovarAposNaoAutorizado(): Promise<string | null> {
  try {
    return await renovarSessao();
  } catch (err) {
    if (err instanceof SessaoInvalidaError) return null;
    throw err;
  }
}

async function lerCorpo(resposta: Response): Promise<unknown> {
  if (resposta.status === 204) return undefined;
  const texto = await resposta.text();
  if (!texto) return undefined;
  const tipo = resposta.headers?.get?.('content-type') ?? '';
  if (tipo.includes('json')) {
    try {
      return JSON.parse(texto);
    } catch {
      return texto;
    }
  }
  return texto;
}

export function criarApiClient(deps: DependenciasApiClient) {
  const baseUrl = deps.baseUrl.replace(/\/+$/, '');
  const obterToken = deps.obterToken ?? obterAccessTokenValido;
  const renovarToken = deps.renovarToken ?? renovarAposNaoAutorizado;
  const executarFetch = (...args: Parameters<typeof fetch>) => (deps.fetch ?? globalThis.fetch)(...args);

  async function request<T = unknown>(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
    const url = `${baseUrl}${caminho.startsWith('/') ? caminho : `/${caminho}`}`;
    const autenticado = opcoes.autenticado !== false;

    const headers: Record<string, string> = { Accept: 'application/json', ...opcoes.headers };
    let body: BodyInit | undefined;
    if (opcoes.body !== undefined) {
      const ehFormData = typeof FormData !== 'undefined' && opcoes.body instanceof FormData;
      if (typeof opcoes.body === 'string' || ehFormData) {
        body = opcoes.body as BodyInit;
      } else {
        body = JSON.stringify(opcoes.body);
        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
      }
    }

    const enviar = async (token: string | null): Promise<Response> => {
      const h = { ...headers };
      if (token) h.Authorization = `Bearer ${token}`;
      try {
        return await executarFetch(url, { method: opcoes.method ?? 'GET', headers: h, body, signal: opcoes.signal });
      } catch (err) {
        throw new ApiError(0, null, url, (err as Error)?.message || undefined);
      }
    };

    const token = autenticado ? await obterToken() : null;
    let resposta = await enviar(token);

    if (resposta.status === 401 && autenticado && token) {
      const novoToken = await renovarToken();
      if (novoToken) {
        resposta = await enviar(novoToken);
      }
    }

    const corpo = await lerCorpo(resposta);
    if (!resposta.ok) {
      throw new ApiError(resposta.status, corpo, url);
    }
    return corpo as T;
  }

  return {
    request,
    get: <T = unknown>(caminho: string, opcoes?: Omit<OpcoesRequisicao, 'method' | 'body'>) =>
      request<T>(caminho, { ...opcoes, method: 'GET' }),
    post: <T = unknown>(caminho: string, body?: unknown, opcoes?: Omit<OpcoesRequisicao, 'method' | 'body'>) =>
      request<T>(caminho, { ...opcoes, method: 'POST', body }),
    put: <T = unknown>(caminho: string, body?: unknown, opcoes?: Omit<OpcoesRequisicao, 'method' | 'body'>) =>
      request<T>(caminho, { ...opcoes, method: 'PUT', body }),
    patch: <T = unknown>(caminho: string, body?: unknown, opcoes?: Omit<OpcoesRequisicao, 'method' | 'body'>) =>
      request<T>(caminho, { ...opcoes, method: 'PATCH', body }),
    delete: <T = unknown>(caminho: string, opcoes?: Omit<OpcoesRequisicao, 'method' | 'body'>) =>
      request<T>(caminho, { ...opcoes, method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof criarApiClient>;

export const apiClient: ApiClient = criarApiClient({ baseUrl: runtimeConfig.apiBaseUrl });
