import { runtimeConfig } from '../config/runtime.js';
import {
  salvarTokens,
  obterAccessToken,
  obterRefreshToken,
  obterTokens,
  limparTokens,
} from './tokenStorageService.js';

export {
  salvarTokens,
  obterAccessToken,
  obterRefreshToken,
  obterTokens,
  limparTokens,
};

export async function loginWithGoogle(idToken) {
  try {
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/auth/sso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        provider: 'GOOGLE',
        idToken: idToken,
      }),
    });

    const data = await response.json();

    // Se a resposta não for 200 OK (ex: 400 ou 401), lança o erro para travar o fluxo
    if (!response.ok) {
      throw new Error(data.message || 'Falha na autenticação com o Google.');
    }

    // Guarda access/refresh tokens exclusivamente no expo-secure-store (nunca em SQLite ou memória persistida)
    await salvarTokens({
      accessToken: data.accessToken || data.access_token || null,
      refreshToken: data.refreshToken || data.refresh_token || null,
    });

    return data; // Retorna accessToken, tokenType e perfilCompleto
  } catch (error) {
    console.error('Erro detalhado no login SSO:', error.message);
    throw error; // Propaga o erro para a tela tratar
  }
}

/**
 * Encerra a sessão local removendo os tokens do `expo-secure-store`.
 */
export async function logout() {
  return await limparTokens();
}
