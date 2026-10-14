import { runtimeConfig } from '../config/runtime';

function gerarCodigoLocal() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function montarQrPayload(idosoId, codigo) {
  return `seniorinsight://idoso/${idosoId}/codigo/${codigo}`;
}

export async function gerarCodigoIdentidade(idosoId, token = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers.Authorization = 'Bearer ' + token;

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
  } catch (error) {
    console.warn('[identityService] Falha ao gerar identidade no backend. Usando fallback local:', error.message);
  }

  const codigo = gerarCodigoLocal();
  return {
    codigo,
    qrValue: montarQrPayload(idosoId, codigo),
  };
}
