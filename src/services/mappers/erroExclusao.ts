import type { ErroExclusao } from '../exclusaoContaService';

/**
 * Camada anticorrupção do contexto de exclusão, lado do erro: traduz a recusa do report-v1
 * (status e corpo no formato Erro do contrato) para o ErroExclusao que o app mostra.
 *
 * O report-service responde 409 para dois casos e só os separa pelo texto de `message`
 * (ExclusaoException.assinaturaAtiva x pedidoEmAndamento). Na dúvida, vale PEDIDO_EM_ANDAMENTO:
 * é o que não afirma que nada foi apagado.
 */
export const STATUS_TITULAR_NAO_ENCONTRADO = 404;
export const STATUS_CONFLITO = 409;

const TRECHO_ASSINATURA_ATIVA = 'assinatura';

function mensagemDoCorpo(corpo: unknown): string {
  const mensagem = (corpo as { message?: unknown } | null)?.message;
  return typeof mensagem === 'string' ? mensagem : '';
}

/** null quando o status não tem tradução própria: quem chama decide o que fazer. */
export function erroDaRecusa(status: number, corpo: unknown): ErroExclusao | null {
  if (status === STATUS_TITULAR_NAO_ENCONTRADO) return 'TITULAR_NAO_ENCONTRADO';
  if (status !== STATUS_CONFLITO) return null;
  return mensagemDoCorpo(corpo).toLowerCase().includes(TRECHO_ASSINATURA_ATIVA)
    ? 'ASSINATURA_ATIVA'
    : 'PEDIDO_EM_ANDAMENTO';
}
