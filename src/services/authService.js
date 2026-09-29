import { runtimeConfig } from '../config/runtime';

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

    return data; // Retorna accessToken, tokenType e perfilCompleto
  } catch (error) {
    console.error('Erro detalhado no login SSO:', error.message);
    throw error; // Propaga o erro para a tela tratar
  }
}