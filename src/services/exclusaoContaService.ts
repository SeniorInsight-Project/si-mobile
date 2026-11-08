import { apiClient, ApiError, type ApiClient } from './apiClient';
import { obterAparelhoPareado } from './aparelhoPareadoService';
import { encerrarSessaoLocal } from './authSession';
import type { PedidoExclusao, SolicitarExclusaoRequest } from '../types/api';

/**
 * Exclusão da conta e dos dados (HU-022 / RF-015 / RN-018 / RNF-017).
 *
 * Rota conforme si-contracts#7 (report-v1):
 * POST /api/v1/report/titulares/{titularId}/exclusao
 *
 * Ação definitiva e com efeito legal: o app NUNCA finge que o pedido foi enviado. Sem resposta do
 * servidor, devolve SEM_CONEXAO e nada é apagado. A simulação de sucesso existe só em desenvolvimento
 * (`permitirSimulacao`), para a demonstração do fluxo sem backend.
 */
export const FRASE_CONFIRMACAO = 'EXCLUIR';
export const PRAZO_COMPROVANTE_DIAS = 15;
export const TIMEOUT_REDE_MS = 10000;

export type ErroExclusao = 'FRASE_INVALIDA' | 'ASSINATURA_ATIVA' | 'SEM_CONEXAO' | 'RECUSADO';

export const MENSAGENS_EXCLUSAO: Record<ErroExclusao, string> = {
  FRASE_INVALIDA: 'Digite EXCLUIR para confirmar.',
  ASSINATURA_ATIVA: 'Há uma assinatura Premium ativa. Cancele a assinatura antes de confirmar a exclusão.',
  SEM_CONEXAO: 'Não foi possível enviar o pedido agora. Nada foi apagado. Tente de novo com internet.',
  RECUSADO: 'O servidor não aceitou o pedido. Nada foi apagado. Tente de novo mais tarde.',
};

export class ExclusaoError extends Error {
  readonly tipo: ErroExclusao;
  constructor(tipo: ErroExclusao) {
    super(MENSAGENS_EXCLUSAO[tipo]);
    this.name = 'ExclusaoError';
    this.tipo = tipo;
  }
}

/** A frase vale sem diferenciar maiúsculas e ignorando espaços nas pontas. */
export function confirmacaoValida(texto: string): boolean {
  return String(texto ?? '').trim().toUpperCase() === FRASE_CONFIRMACAO;
}

export interface ComprovanteExclusao {
  protocolo: string;
  prazoDias: number;
  /** true quando o pedido NÃO foi ao servidor (só em desenvolvimento). */
  simulado: boolean;
}

export interface ExclusaoOptions {
  assinaturaAtiva?: boolean;
  cliente?: Pick<ApiClient, 'post'>;
  timeoutMs?: number;
  permitirSimulacao?: boolean;
  titularId?: string | null;
}

declare const __DEV__: boolean | undefined;

function emDesenvolvimento(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

export const rotaExclusao = (titularId = 'me') => `/api/v1/report/titulares/${titularId}/exclusao`;
export const ROTA_EXCLUSAO = rotaExclusao('me');

async function resolverTitularId(informado?: string | null): Promise<string> {
  if (informado) return informado;
  const pareado = await obterAparelhoPareado();
  if (pareado?.perfilId) return pareado.perfilId;
  return 'me';
}

export async function solicitarExclusao(
  confirmacao: string,
  {
    assinaturaAtiva = false,
    cliente = apiClient,
    timeoutMs = TIMEOUT_REDE_MS,
    permitirSimulacao = emDesenvolvimento(),
    titularId,
  }: ExclusaoOptions = {}
): Promise<ComprovanteExclusao> {
  if (!confirmacaoValida(confirmacao)) throw new ExclusaoError('FRASE_INVALIDA');
  if (assinaturaAtiva) throw new ExclusaoError('ASSINATURA_ATIVA');

  const idFinal = await resolverTitularId(titularId);
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const payload: SolicitarExclusaoRequest = { confirmacao: 'EXCLUIR' };
    const dados = await cliente.post<PedidoExclusao | undefined>(
      rotaExclusao(idFinal),
      payload,
      { signal: controlador.signal }
    );
    return {
      protocolo: String(dados?.protocolo ?? ''),
      prazoDias: Number(dados?.prazoDias ?? PRAZO_COMPROVANTE_DIAS),
      simulado: false,
    };
  } catch (erro) {
    // O servidor respondeu e recusou (4xx): não se simula sucesso.
    if (erro instanceof ApiError && erro.status >= 400 && erro.status < 500 && !erro.erroDeRede && erro.status !== 404) {
      throw new ExclusaoError('RECUSADO');
    }
    console.warn('[exclusaoContaService] O servidor não concluiu o pedido.');
  } finally {
    clearTimeout(temporizador);
  }

  if (permitirSimulacao) {
    return { protocolo: `DEV-${Date.now().toString(36).toUpperCase()}`, prazoDias: PRAZO_COMPROVANTE_DIAS, simulado: true };
  }
  throw new ExclusaoError('SEM_CONEXAO');
}

/**
 * Após o envio do pedido de exclusão, limpa os tokens e apaga todos os dados locais (SQLite) (HU-022).
 */
export async function executarLimpezaLocalExclusao(): Promise<void> {
  await encerrarSessaoLocal('logout');
}
