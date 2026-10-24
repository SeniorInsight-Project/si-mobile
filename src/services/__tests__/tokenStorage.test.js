import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_STORAGE_KEYS,
  setSecureStoreAdapter,
  salvarTokens,
  obterAccessToken,
  obterRefreshToken,
  obterTokens,
  limparTokens,
  resolverTokenAutorizacao,
} from '../tokenStorageService.js';

function criarMockSecureStore() {
  const cofre = new Map();
  return {
    cofre,
    isAvailableAsync: async () => true,
    getItemAsync: async (key) => (cofre.has(key) ? cofre.get(key) : null),
    setItemAsync: async (key, value) => {
      cofre.set(key, String(value));
    },
    deleteItemAsync: async (key) => {
      cofre.delete(key);
    },
  };
}

test('salvarTokens e obterTokens devem persistir access e refresh tokens no expo-secure-store', async () => {
  const mockStore = criarMockSecureStore();
  setSecureStoreAdapter(mockStore);

  const salvou = await salvarTokens({
    accessToken: 'jwt-access-token-123',
    refreshToken: 'jwt-refresh-token-456',
  });

  assert.equal(salvou, true);
  assert.equal(mockStore.cofre.get(TOKEN_STORAGE_KEYS.ACCESS_TOKEN), 'jwt-access-token-123');
  assert.equal(mockStore.cofre.get(TOKEN_STORAGE_KEYS.REFRESH_TOKEN), 'jwt-refresh-token-456');

  const access = await obterAccessToken();
  const refresh = await obterRefreshToken();
  const ambos = await obterTokens();

  assert.equal(access, 'jwt-access-token-123');
  assert.equal(refresh, 'jwt-refresh-token-456');
  assert.deepEqual(ambos, {
    accessToken: 'jwt-access-token-123',
    refreshToken: 'jwt-refresh-token-456',
  });
});

test('limparTokens deve remover access e refresh tokens do expo-secure-store', async () => {
  const mockStore = criarMockSecureStore();
  setSecureStoreAdapter(mockStore);

  await salvarTokens({
    accessToken: 'jwt-access-abc',
    refreshToken: 'jwt-refresh-def',
  });

  const limpou = await limparTokens();
  assert.equal(limpou, true);

  const ambos = await obterTokens();
  assert.deepEqual(ambos, {
    accessToken: null,
    refreshToken: null,
  });
});

test('resolverTokenAutorizacao deve priorizar token explícito ou buscar do expo-secure-store', async () => {
  const mockStore = criarMockSecureStore();
  setSecureStoreAdapter(mockStore);

  await salvarTokens({
    accessToken: 'token-do-secure-store',
  });

  const tokenImplicito = await resolverTokenAutorizacao();
  assert.equal(tokenImplicito, 'token-do-secure-store');

  const tokenExplicito = await resolverTokenAutorizacao('token-explicito-override');
  assert.equal(tokenExplicito, 'token-explicito-override');
});

test('não deve manter tokens em memória caso o expo-secure-store esteja indisponível', async () => {
  setSecureStoreAdapter({
    isAvailableAsync: async () => false,
    getItemAsync: async () => null,
    setItemAsync: async () => {},
    deleteItemAsync: async () => {},
  });

  const salvou = await salvarTokens({
    accessToken: 'token-nao-deve-vazar',
    refreshToken: 'refresh-nao-deve-vazar',
  });

  assert.equal(salvou, false);
  assert.equal(await obterAccessToken(), null);
  assert.equal(await obterRefreshToken(), null);
});

test('authService.loginWithGoogle deve salvar accessToken e refreshToken no expo-secure-store automaticamente', async () => {
  const mockStore = criarMockSecureStore();
  setSecureStoreAdapter(mockStore);

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      accessToken: 'access-sso-google-999',
      refreshToken: 'refresh-sso-google-888',
      tokenType: 'Bearer',
      perfilCompleto: true,
    }),
  });

  try {
    const { loginWithGoogle, logout } = await import('../authService.js');
    const resultado = await loginWithGoogle('google-id-token-valido');

    assert.equal(resultado.accessToken, 'access-sso-google-999');
    assert.equal(await obterAccessToken(), 'access-sso-google-999');
    assert.equal(await obterRefreshToken(), 'refresh-sso-google-888');

    await logout();
    assert.equal(await obterAccessToken(), null);
    assert.equal(await obterRefreshToken(), null);
  } finally {
    global.fetch = originalFetch;
  }
});

