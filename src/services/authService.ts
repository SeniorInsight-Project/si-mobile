import { runtimeConfig } from '../config/runtime';

export interface SsoAuthResponse {
  accessToken?: string;
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

    return data; // Retorna accessToken, tokenType e perfilCompleto
  } catch (error: any) {
    console.error('Erro detalhado no login SSO:', error?.message);
    throw error; // Propaga o erro para a tela tratar
  }
}
