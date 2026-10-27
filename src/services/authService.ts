import { runtimeConfig } from '../config/runtime';
import {
  salvarTokens,
  obterAccessToken,
  obterRefreshToken,
  obterTokens,
  limparTokens,
} from './tokenStorageService';

export {
  salvarTokens,
  obterAccessToken,
  obterRefreshToken,
  obterTokens,
  limparTokens,
};

export interface SsoAuthResponse {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  perfilCompleto?: boolean;
  message?: string;
  [key: string]: unknown;
}

export async function loginWithGoogle(idToken: string): Promise<SsoAuthResponse> {
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

    const data: SsoAuthResponse = await response.json();

    // Se a resposta não for 200 OK (ex: 400 ou 401), lança o erro para travar o fluxo
    if (!response.ok) {
      throw new Error(data.message || 'Falha na autenticação com o Google.');
    }

    // Guarda access/refresh tokens exclusivamente no expo-secure-store (nunca em SQLite ou memória persistida)
    await salvarTokens({
      accessToken: data.accessToken || (data.access_token as string | undefined) || null,
      refreshToken: data.refreshToken || (data.refresh_token as string | undefined) || null,
    });

    return data; // Retorna accessToken, tokenType e perfilCompleto
  } catch (error: any) {
    console.error('Erro detalhado no login SSO:', error?.message);
    throw error; // Propaga o erro para a tela tratar
  }
}

/**
 * Encerra a sessão local removendo os tokens do `expo-secure-store`.
 */
export async function logout(): Promise<boolean> {
  return await limparTokens();
}
