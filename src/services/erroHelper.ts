import { ApiError } from './apiClient';

/**
 * Lê a mensagem de erro retornada pelos serviços e pelos contratos do si-contracts.
 * Dá preferência para os campos `mensagem`, `message` ou `error` contidos no payload
 * de erro da API.
 */
export function extrairMensagemErro(corpoOuErro: unknown, fallback = 'Erro inesperado'): string {
  if (corpoOuErro === null || corpoOuErro === undefined) {
    return fallback;
  }

  if (corpoOuErro instanceof ApiError) {
    if (corpoOuErro.erroDeRede) {
      return 'Não foi possível falar com o servidor. Verifique sua conexão.';
    }
    return extrairMensagemErro(corpoOuErro.corpo, corpoOuErro.message || fallback);
  }

  if (corpoOuErro instanceof Error) {
    return corpoOuErro.message || fallback;
  }

  if (typeof corpoOuErro === 'string') {
    const texto = corpoOuErro.trim();
    return texto.length > 0 ? texto : fallback;
  }

  if (typeof corpoOuErro === 'object') {
    const obj = corpoOuErro as Record<string, unknown>;
    if (typeof obj.mensagem === 'string' && obj.mensagem.trim()) {
      return obj.mensagem.trim();
    }
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message.trim();
    }
    if (typeof obj.error === 'string' && obj.error.trim()) {
      return obj.error.trim();
    }
  }

  return fallback;
}
