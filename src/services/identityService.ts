import { runtimeConfig } from '../config/runtime';
import { resolverTokenAutorizacao } from './tokenStorageService';

export interface CodigoIdentidadeResponse {
  codigo: string;
  qrValue: string;
}

function gerarCodigoLocal(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function montarQrPayload(idosoId: string, codigo: string): string {
  return `seniorinsight://idoso/${idosoId}/codigo/${codigo}`;
}

export async function gerarCodigoIdentidade(
  idosoId: string,
  token: string | null = null
): Promise<CodigoIdentidadeResponse> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers.Authorization = 'Bearer ' + authToken;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/identity/idosos/${idosoId}/codigo`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        codigo: String(data.codigo || gerarCodigoLocal()),
        qrValue: data.qrValue || montarQrPayload(idosoId, data.codigo || gerarCodigoLocal()),
      };
    }
  } catch (error: any) {
    console.warn('[identityService] Falha ao gerar identidade no backend. Usando fallback local:', error?.message);
  }

  const codigo = gerarCodigoLocal();
  return {
    codigo,
    qrValue: montarQrPayload(idosoId, codigo),
  };
}
