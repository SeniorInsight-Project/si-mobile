/**
 * Sessão do usuário autenticado pelo Keycloak (HU-002 / HU-004).
 *
 * - Tokens e expiração ficam só no `expo-secure-store` (tokenStorageService).
 * - O access token é renovado com o refresh token um pouco antes de vencer e,
 *   no máximo uma vez, quando o gateway responde 401 (ver apiClient).
 * - Refresh token inválido encerra a sessão: limpa o secure store e os bancos
 *   locais e avisa quem estiver ouvindo (o App volta para o Login).
 *
 * Este módulo não importa `expo-auth-session` no topo: a implementação padrão do
 * provedor carrega o módulo sob demanda, e os testes injetam um provedor falso.
 */
import { runtimeConfig } from '../config/runtime';
import {
  salvarTokens,
  obterTokens,
  limparTokens,
  salvarExpiracaoAccessToken,
  obterExpiracaoAccessToken,
} from './tokenStorageService';

export const KEYCLOAK_CLIENT_ID = 'si-mobile';

/** Renova o access token quando faltar menos que isso para ele vencer. */
export const MARGEM_RENOVACAO_MS = 60_000;

export interface RespostaTokens {
  accessToken: string;
  refreshToken?: string | null;
  /** Validade do access token em segundos. */
  expiresIn?: number | null;
  /** Instante de emissão em segundos (epoch), como no TokenResponse do expo-auth-session. */
  issuedAt?: number | null;
}

export interface ProvedorOidc {
  renovar(refreshToken: string): Promise<RespostaTokens>;
  revogar(refreshToken: string): Promise<void>;
}

export type MotivoEncerramento = 'logout' | 'expirada';
type OuvinteEncerramento = (motivo: MotivoEncerramento) => void;
type LimpadorLocal = () => Promise<void>;

/** Refresh token ausente, expirado ou revogado: é preciso fazer login de novo. */
export class SessaoInvalidaError extends Error {
  constructor(message = 'Sessão expirada. Entre novamente.') {
    super(message);
    this.name = 'SessaoInvalidaError';
  }
}

// Códigos OAuth que indicam que o refresh token não serve mais (RFC 6749, 5.2).
const ERROS_REFRESH_INVALIDO = new Set(['invalid_grant', 'invalid_client', 'unauthorized_client']);

// ---------------------------------------------------------------------------
// Dependências (substituíveis nos testes)
// ---------------------------------------------------------------------------

let descobertaEmCache: Promise<any> | null = null;

async function obterAuthSessionEDescoberta(): Promise<{ AuthSession: any; discovery: any }> {
  const AuthSession: any = await import('expo-auth-session');
  if (!descobertaEmCache) {
    descobertaEmCache = AuthSession.fetchDiscoveryAsync(runtimeConfig.keycloakIssuer).catch((err: unknown) => {
      descobertaEmCache = null;
      throw err;
    });
  }
  return { AuthSession, discovery: await descobertaEmCache };
}

const provedorPadrao: ProvedorOidc = {
  async renovar(refreshToken) {
    const { AuthSession, discovery } = await obterAuthSessionEDescoberta();
    const resposta = await AuthSession.refreshAsync({ clientId: KEYCLOAK_CLIENT_ID, refreshToken }, discovery);
    return {
      accessToken: resposta.accessToken,
      refreshToken: resposta.refreshToken,
      expiresIn: resposta.expiresIn,
      issuedAt: resposta.issuedAt,
    };
  },
  async revogar(refreshToken) {
    const { AuthSession, discovery } = await obterAuthSessionEDescoberta();
    await AuthSession.revokeAsync(
      { clientId: KEYCLOAK_CLIENT_ID, token: refreshToken, tokenTypeHint: AuthSession.TokenTypeHint.RefreshToken },
      discovery,
    );
  },
};

const limpadoresPadrao: LimpadorLocal[] = [
  async () => (await import('./sosQueueService')).limparFilaSosLocal(),
  async () => (await import('./medicamentoDatabase')).limparCacheMedicamentos(),
];

let provedor: ProvedorOidc = provedorPadrao;
let limpadores: LimpadorLocal[] = limpadoresPadrao;
let agora: () => number = () => Date.now();

export interface ConfiguracaoSessao {
  provedor?: ProvedorOidc;
  limpadoresLocais?: LimpadorLocal[];
  relogio?: () => number;
}

/** Troca dependências (testes). Chame sem argumentos para voltar ao padrão. */
export function configurarSessao(config: ConfiguracaoSessao = {}): void {
  provedor = config.provedor ?? provedorPadrao;
  limpadores = config.limpadoresLocais ?? limpadoresPadrao;
  agora = config.relogio ?? (() => Date.now());
  renovacaoEmAndamento = null;
}

// ---------------------------------------------------------------------------
// Ouvintes de encerramento
// ---------------------------------------------------------------------------

const ouvintes = new Set<OuvinteEncerramento>();

/** Registra um ouvinte chamado quando a sessão termina (logout ou refresh inválido). */
export function aoEncerrarSessao(ouvinte: OuvinteEncerramento): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

// ---------------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------------

/** Salva access/refresh token e a expiração calculada a partir de issuedAt + expiresIn. */
export async function salvarSessao(resposta: RespostaTokens): Promise<void> {
  await salvarTokens({ accessToken: resposta.accessToken, refreshToken: resposta.refreshToken ?? null });

  if (typeof resposta.expiresIn === 'number' && resposta.expiresIn > 0) {
    const emitidoEmMs = typeof resposta.issuedAt === 'number' ? resposta.issuedAt * 1000 : agora();
    await salvarExpiracaoAccessToken(emitidoEmMs + resposta.expiresIn * 1000);
    return;
  }

  // Sem expires_in na resposta: usa o `exp` do próprio JWT.
  const exp = decodificarJwt(resposta.accessToken)?.exp;
  if (typeof exp === 'number') {
    await salvarExpiracaoAccessToken(exp * 1000);
  }
}

let renovacaoEmAndamento: Promise<string> | null = null;

/**
 * Renova o access token com o refresh token salvo. Chamadas simultâneas
 * compartilham a mesma requisição ao Keycloak.
 *
 * @throws {SessaoInvalidaError} se não houver refresh token ou o Keycloak o recusar
 *   (a sessão local já terá sido encerrada).
 * @throws o erro original em falhas transitórias (rede, 5xx); a sessão é mantida.
 */
export function renovarSessao(): Promise<string> {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = executarRenovacao().finally(() => {
      renovacaoEmAndamento = null;
    });
  }
  return renovacaoEmAndamento;
}

async function executarRenovacao(): Promise<string> {
  const { refreshToken } = await obterTokens();
  if (!refreshToken) {
    await encerrarSessaoLocal('expirada');
    throw new SessaoInvalidaError();
  }

  let resposta: RespostaTokens;
  try {
    resposta = await provedor.renovar(refreshToken);
  } catch (err) {
    if (refreshRecusado(err)) {
      await encerrarSessaoLocal('expirada');
      throw new SessaoInvalidaError();
    }
    throw err;
  }

  // O Keycloak pode ou não rotacionar o refresh token; mantém o atual se não vier outro.
  await salvarSessao({ ...resposta, refreshToken: resposta.refreshToken || refreshToken });
  return resposta.accessToken;
}

function refreshRecusado(err: unknown): boolean {
  const e = err as { code?: unknown; status?: unknown } | null;
  if (e && typeof e.code === 'string' && ERROS_REFRESH_INVALIDO.has(e.code)) return true;
  return e?.status === 400 || e?.status === 401;
}

/**
 * Devolve um access token utilizável, renovando-o se estiver para vencer.
 * Retorna null quando não há sessão (ou ela acabou de ser encerrada).
 */
export async function obterAccessTokenValido(): Promise<string | null> {
  const { accessToken, refreshToken } = await obterTokens();
  if (!accessToken) return null;

  const expiraEm = await obterExpiracaoAccessToken();
  const vencendo = expiraEm !== null && expiraEm - agora() <= MARGEM_RENOVACAO_MS;
  if (!vencendo) return accessToken;

  if (!refreshToken) {
    if (expiraEm !== null && expiraEm <= agora()) {
      await encerrarSessaoLocal('expirada');
      return null;
    }
    return accessToken;
  }

  try {
    return await renovarSessao();
  } catch (err) {
    if (err instanceof SessaoInvalidaError) return null;
    // Falha transitória (ex.: sem rede): segue com o token atual; o gateway decide.
    console.warn('[authSession] Não foi possível renovar o token agora:', (err as Error)?.message);
    return accessToken;
  }
}

/** Limpa tokens e bancos locais e avisa os ouvintes. Não fala com o Keycloak. */
export async function encerrarSessaoLocal(motivo: MotivoEncerramento): Promise<void> {
  await limparTokens();
  for (const limpar of limpadores) {
    try {
      await limpar();
    } catch (err) {
      console.warn('[authSession] Falha ao limpar dados locais:', (err as Error)?.message);
    }
  }
  ouvintes.forEach((ouvinte) => ouvinte(motivo));
}

/**
 * Sair da conta: revoga o refresh token no Keycloak (melhor esforço, sem rede o
 * logout local acontece do mesmo jeito), limpa o secure store e o SQLite.
 */
export async function sair(): Promise<void> {
  const { refreshToken } = await obterTokens();
  if (refreshToken) {
    try {
      await provedor.revogar(refreshToken);
    } catch (err) {
      console.warn('[authSession] Falha ao revogar o refresh token:', (err as Error)?.message);
    }
  }
  await encerrarSessaoLocal('logout');
}

// ---------------------------------------------------------------------------
// Token e papéis
// ---------------------------------------------------------------------------

export interface ClaimsToken {
  sub?: string;
  exp?: number;
  name?: string;
  email?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  [claim: string]: unknown;
}

/** Lê o payload de um JWT sem validar a assinatura (quem valida é o gateway). */
export function decodificarJwt(token: string | null | undefined): ClaimsToken | null {
  const payload = token?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const binario = atob(base64);
    const json = decodeURIComponent(
      Array.from(binario, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Roles de realm do Keycloak presentes no token (familiar, medico, idoso, gestor, admin). */
export function papeisDoToken(token: string | null | undefined): string[] {
  const roles = decodificarJwt(token)?.realm_access?.roles;
  return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
}

export type TelaInicial = 'ElderlyMode' | 'Home' | 'AcessoRestrito';

/** idoso -> modo idoso; familiar -> início da família; qualquer outro papel -> aviso. */
export function telaInicialPorPapeis(papeis: string[]): TelaInicial {
  if (papeis.includes('idoso')) return 'ElderlyMode';
  if (papeis.includes('familiar')) return 'Home';
  return 'AcessoRestrito';
}

/** Página de redefinição de senha do Keycloak (HU-004). */
export function urlRedefinicaoSenha(issuer: string = runtimeConfig.keycloakIssuer): string {
  return `${issuer}/login-actions/reset-credentials?client_id=${encodeURIComponent(KEYCLOAK_CLIENT_ID)}`;
}
