/**
 * Serviço de armazenamento seguro de tokens de autenticação (access e refresh).
 *
 * Regra de Arquitetura (Seção 6 / Issue #16):
 * - Tokens (access/refresh) devem ficar exclusivamente no `expo-secure-store`
 *   (Keystore no Android / Keychain no iOS).
 * - Nunca devem ser persistidos no SQLite (reservado apenas para cache offline - RNF de offline)
 *   nem em memória persistida não criptografada (AsyncStorage / localStorage).
 */

export const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'si_auth_access_token',
  REFRESH_TOKEN: 'si_auth_refresh_token',
  /** Instante (epoch em ms) em que o access token expira. */
  ACCESS_TOKEN_EXPIRES_AT: 'si_auth_access_token_expires_at',
};

export interface SecureStoreAdapter {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
  isAvailableAsync?: () => Promise<boolean>;
}

export interface AuthTokens {
  accessToken?: string | null;
  refreshToken?: string | null;
}

let secureStoreAdapter: SecureStoreAdapter | null = null;

/**
 * Permite injetar um adaptador customizado (útil para testes automatizados).
 * @param {object|null} adapter - Objeto contendo getItemAsync, setItemAsync e deleteItemAsync
 */
export function setSecureStoreAdapter(adapter: SecureStoreAdapter | null): void {
  secureStoreAdapter = adapter;
}

/**
 * Carrega o módulo `expo-secure-store` sob demanda.
 */
async function getSecureStore(): Promise<SecureStoreAdapter | null> {
  if (secureStoreAdapter) {
    return secureStoreAdapter;
  }

  try {
    const mod: any = await import('expo-secure-store');
    secureStoreAdapter = mod.default && mod.default.getItemAsync ? mod.default : mod;
    return secureStoreAdapter;
  } catch (err: any) {
    console.warn('[tokenStorageService] expo-secure-store indisponível neste ambiente:', err?.message);
    return null;
  }
}

/**
 * Verifica se o `expo-secure-store` está disponível no dispositivo atual.
 * @returns {Promise<boolean>}
 */
async function isStoreAvailable(store: SecureStoreAdapter | null): Promise<boolean> {
  if (!store || typeof store.getItemAsync !== 'function') {
    return false;
  }
  if (typeof store.isAvailableAsync === 'function') {
    try {
      return await store.isAvailableAsync();
    } catch (err: any) {
      return false;
    }
  }
  return true;
}

/**
 * Salva o accessToken e (opcionalmente) o refreshToken no `expo-secure-store`.
 * @param {{ accessToken?: string|null, refreshToken?: string|null }} tokens
 * @returns {Promise<boolean>}
 */
export async function salvarTokens({ accessToken, refreshToken }: AuthTokens = {}): Promise<boolean> {
  const store = await getSecureStore();
  if (!store || !(await isStoreAvailable(store))) {
    return false;
  }

  if (typeof accessToken === 'string' && accessToken.trim().length > 0) {
    await store.setItemAsync(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, accessToken.trim());
  }

  if (typeof refreshToken === 'string' && refreshToken.trim().length > 0) {
    await store.setItemAsync(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, refreshToken.trim());
  }

  return true;
}

/**
 * Obtém o accessToken armazenado no `expo-secure-store`.
 * @returns {Promise<string|null>}
 */
export async function obterAccessToken(): Promise<string | null> {
  const store = await getSecureStore();
  if (!store || !(await isStoreAvailable(store))) {
    return null;
  }

  try {
    return await store.getItemAsync(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
  } catch (err: any) {
    console.warn('[tokenStorageService] Falha ao ler accessToken do SecureStore:', err?.message);
    return null;
  }
}

/**
 * Obtém o refreshToken armazenado no `expo-secure-store`.
 * @returns {Promise<string|null>}
 */
export async function obterRefreshToken(): Promise<string | null> {
  const store = await getSecureStore();
  if (!store || !(await isStoreAvailable(store))) {
    return null;
  }

  try {
    return await store.getItemAsync(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
  } catch (err: any) {
    console.warn('[tokenStorageService] Falha ao ler refreshToken do SecureStore:', err?.message);
    return null;
  }
}

/**
 * Guarda o instante (epoch em ms) em que o access token expira.
 * @returns {Promise<boolean>}
 */
export async function salvarExpiracaoAccessToken(expiraEmMs: number): Promise<boolean> {
  const store = await getSecureStore();
  if (!store || !(await isStoreAvailable(store)) || !Number.isFinite(expiraEmMs)) {
    return false;
  }
  await store.setItemAsync(TOKEN_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT, String(Math.floor(expiraEmMs)));
  return true;
}

/**
 * Obtém o instante (epoch em ms) em que o access token expira, ou null se desconhecido.
 * @returns {Promise<number|null>}
 */
export async function obterExpiracaoAccessToken(): Promise<number | null> {
  const store = await getSecureStore();
  if (!store || !(await isStoreAvailable(store))) {
    return null;
  }

  try {
    const valor = await store.getItemAsync(TOKEN_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT);
    const numero = valor ? Number(valor) : NaN;
    return Number.isFinite(numero) ? numero : null;
  } catch (err: any) {
    console.warn('[tokenStorageService] Falha ao ler a expiração do SecureStore:', err?.message);
    return null;
  }
}

/**
 * Obtém o par { accessToken, refreshToken } do `expo-secure-store`.
 * @returns {Promise<{ accessToken: string|null, refreshToken: string|null }>}
 */
export async function obterTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const [accessToken, refreshToken] = await Promise.all([
    obterAccessToken(),
    obterRefreshToken(),
  ]);

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Remove os tokens (access e refresh) do `expo-secure-store` (ex.: no logout).
 * @returns {Promise<boolean>}
 */
export async function limparTokens(): Promise<boolean> {
  const store = await getSecureStore();
  if (!store || !(await isStoreAvailable(store))) {
    return false;
  }

  try {
    await Promise.all([
      store.deleteItemAsync(TOKEN_STORAGE_KEYS.ACCESS_TOKEN),
      store.deleteItemAsync(TOKEN_STORAGE_KEYS.REFRESH_TOKEN),
      store.deleteItemAsync(TOKEN_STORAGE_KEYS.ACCESS_TOKEN_EXPIRES_AT),
    ]);
    return true;
  } catch (err: any) {
    console.warn('[tokenStorageService] Falha ao remover tokens do SecureStore:', err?.message);
    return false;
  }
}

/**
 * Apaga uma chave do `expo-secure-store` (exclusão da conta, HU-022). Sem secure store
 * (ex.: web), não há o que apagar. Lança se o secure store recusar, para quem chama registrar a falha.
 */
export async function apagarItemSeguro(chave: string): Promise<void> {
  const store = await getSecureStore();
  if (!store || !(await isStoreAvailable(store))) return;
  await store.deleteItemAsync(chave);
}

/**
 * Resolve o token de autorização: utiliza o token informado explicitamente ou
 * busca automaticamente o `accessToken` salvo no `expo-secure-store`.
 * @param {string|null} [tokenExplicito]
 * @returns {Promise<string|null>}
 */
export async function resolverTokenAutorizacao(
  tokenExplicito: string | null = null
): Promise<string | null> {
  if (typeof tokenExplicito === 'string' && tokenExplicito.trim().length > 0) {
    return tokenExplicito.trim();
  }
  return await obterAccessToken();
}
