import type { PedidoExclusao } from '../../types/api';

/**
 * Camada anticorrupção do contexto de exclusão: traduz o PedidoExclusao do report-v1 para o
 * comprovante que a tela mostra. Nada é completado com valor padrão: resposta sem protocolo,
 * prazo ou data devolve null e quem chama decide o que dizer ao titular.
 */
export interface ComprovanteExclusao {
  protocolo: string;
  prazoDias: number;
  /** Epoch ms de quando o servidor registrou o pedido. */
  solicitadoEm: number;
  /** true quando o pedido NÃO foi ao servidor (só em desenvolvimento). */
  simulado: boolean;
}

export function comprovanteDoContrato(dto: PedidoExclusao | null | undefined): ComprovanteExclusao | null {
  const solicitadoEm = typeof dto?.solicitadoEm === 'string' ? Date.parse(dto.solicitadoEm) : NaN;
  const protocoloValido = typeof dto?.protocolo === 'string' && dto.protocolo.trim() !== '';
  const prazoValido = typeof dto?.prazoDias === 'number' && Number.isFinite(dto.prazoDias);
  if (!dto || !protocoloValido || !prazoValido || !Number.isFinite(solicitadoEm)) return null;
  return { protocolo: dto.protocolo, prazoDias: dto.prazoDias, solicitadoEm, simulado: false };
}
