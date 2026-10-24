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
};

let secureStoreAdapter = null;

/**
 * Permite injetar um adaptador customizado (útil para testes automatizados).
 * @param {object|null} adapter - Objeto contendo getItemAsync, setItemAsync e deleteItemAsync
 */
export function setSecureStoreAdapter(adapter) {
  secureStoreAdapter = adapter;
}

/**
 * Carrega o módulo `expo-secure-store` sob demanda.
 */
async function getSecureStore() {
  if (secureStoreAdapter) {
    return secureStoreAdapter;
  }

  try {
    const mod = await import('expo-secure-store');
    secureStoreAdapter = mod.default && mod.default.getItemAsync ? mod.default : mod;
    return secureStoreAdapter;
  } catch (err) {
    console.warn('[tokenStorageService] expo-secure-store indisponível neste ambiente:', err.message);
    return null;
  }
}

/**
 * Verifica se o `expo-secure-store` está disponível no dispositivo atual.
 * @returns {Promise<boolean>}
 */
async function isStoreAvailable(store) {
  if (!store || typeof store.getItemAsync !== 'function') {
    return false;
  }
  if (typeof store.isAvailableAsync === 'function') {
    try {
      return await store.isAvailableAsync();
    } catch (err) {
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
export async function salvarTokens({ accessToken, refreshToken } = {}) {
  const store = await getSecureStore();
  if (!(await isStoreAvailable(store))) {
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
export async function obterAccessToken() {
  const store = await getSecureStore();
  if (!(await isStoreAvailable(store))) {
    return null;
  }

  try {
    return await store.getItemAsync(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
  } catch (err) {
    console.warn('[tokenStorageService] Falha ao ler accessToken do SecureStore:', err.message);
    return null;
  }
}

/**
 * Obtém o refreshToken armazenado no `expo-secure-store`.
 * @returns {Promise<string|null>}
 */
export async function obterRefreshToken() {
  const store = await getSecureStore();
  if (!(await isStoreAvailable(store))) {
    return null;
  }

  try {
    return await store.getItemAsync(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
  } catch (err) {
    console.warn('[tokenStorageService] Falha ao ler refreshToken do SecureStore:', err.message);
    return null;
  }
}

/**
 * Obtém o par { accessToken, refreshToken } do `expo-secure-store`.
 * @returns {Promise<{ accessToken: string|null, refreshToken: string|null }>}
 */
export async function obterTokens() {
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
export async function limparTokens() {
  const store = await getSecureStore();
  if (!(await isStoreAvailable(store))) {
    return false;
  }

  try {
    await Promise.all([
      store.deleteItemAsync(TOKEN_STORAGE_KEYS.ACCESS_TOKEN),
      store.deleteItemAsync(TOKEN_STORAGE_KEYS.REFRESH_TOKEN),
    ]);
    return true;
  } catch (err) {
    console.warn('[tokenStorageService] Falha ao remover tokens do SecureStore:', err.message);
    return false;
  }
}

/**
 * Resolve o token de autorização: utiliza o token informado explicitamente ou
 * busca automaticamente o `accessToken` salvo no `expo-secure-store`.
 * @param {string|null} [tokenExplicito]
 * @returns {Promise<string|null>}
 */
export async function resolverTokenAutorizacao(tokenExplicito = null) {
  if (typeof tokenExplicito === 'string' && tokenExplicito.trim().length > 0) {
    return tokenExplicito.trim();
  }
  return await obterAccessToken();
}
