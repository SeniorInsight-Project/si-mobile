import { apiClient, ApiError, type ApiClient } from './apiClient';
import { decodificarJwt, obterAccessTokenValido } from './authSession';
import { comprovanteDoContrato, type ComprovanteExclusao } from './mappers/exclusao';
import type { PedidoExclusao, SolicitarExclusaoRequest } from '../types/api';

export type { ComprovanteExclusao };

/**
 * Exclusão da conta e dos dados (HU-022 / RF-015 / RN-018 / RNF-017).
 *
 * Rota do report-v1 pelo gateway: POST /api/v1/report/titulares/{titularId}/exclusao.
 * O `titularId` é o `sub` do Keycloak do usuário autenticado, igual para o idoso e para o familiar
 * (padronização proposta em SeniorInsight-Project/si-contracts#19). Vem do access token da sessão,
 * nunca da tela, do pareamento ou do perfil; `idosoId`, `familiarId` e `perfilId` não entram na rota.
 *
 * Ação definitiva e com efeito legal: o app NUNCA finge que o pedido foi enviado. Sem resposta do
 * servidor, devolve SEM_CONEXAO e nada é apagado. A simulação de sucesso existe só em desenvolvimento
 * (`permitirSimulacao`), para a demonstração do fluxo sem backend.
 */
export const FRASE_CONFIRMACAO = 'EXCLUIR';
export const PRAZO_COMPROVANTE_DIAS = 15;
export const TIMEOUT_REDE_MS = 10000;

export type ErroExclusao =
  | 'FRASE_INVALIDA'
  | 'ASSINATURA_ATIVA'
  | 'SEM_TITULAR'
  | 'SEM_CONEXAO'
  | 'RECUSADO'
  | 'RESPOSTA_INVALIDA';

export const MENSAGENS_EXCLUSAO: Record<ErroExclusao, string> = {
  FRASE_INVALIDA: 'Digite EXCLUIR para confirmar.',
  ASSINATURA_ATIVA: 'Há uma assinatura Premium ativa. Cancele a assinatura antes de confirmar a exclusão.',
  SEM_TITULAR: 'Não conseguimos identificar a sua sessão. Nada foi apagado. Entre de novo no app e tente outra vez.',
  SEM_CONEXAO: 'Não foi possível enviar o pedido agora. Nada foi apagado. Tente de novo com internet.',
  RECUSADO: 'O servidor não aceitou o pedido. Nada foi apagado. Tente de novo mais tarde.',
  RESPOSTA_INVALIDA:
    'O pedido pode ter sido registrado, mas não recebemos o protocolo. Veja o comprovante no seu e-mail antes de tentar de novo.',
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

export interface SessaoExclusao {
  /** Access token da sessão atual; por padrão o da sessão salva, renovado se preciso. */
  obterToken?: () => Promise<string | null>;
}

export interface ExclusaoOptions extends SessaoExclusao {
  assinaturaAtiva?: boolean;
  cliente?: Pick<ApiClient, 'post'>;
  timeoutMs?: number;
  permitirSimulacao?: boolean;
}

declare const __DEV__: boolean | undefined;

function emDesenvolvimento(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

export function rotaExclusao(titularId: string): string {
  return `/api/v1/report/titulares/${titularId}/exclusao`;
}

/**
 * Titular dos dados = `sub` do access token da sessão atual, para qualquer papel.
 * Token ausente, ilegível ou sem `sub` lança ExclusaoError (SEM_TITULAR).
 */
export async function titularDaSessao({ obterToken = obterAccessTokenValido }: SessaoExclusao = {}): Promise<string> {
  const sub = decodificarJwt(await obterToken())?.sub;
  if (typeof sub !== 'string' || sub === '') throw new ExclusaoError('SEM_TITULAR');
  return sub;
}

function foiRecusadoPeloServidor(erro: unknown): boolean {
  return (
    erro instanceof ApiError && erro.status >= 400 && erro.status < 500 && !erro.erroDeRede && erro.status !== 404
  );
}

function comprovanteSimulado(): ComprovanteExclusao {
  return {
    protocolo: `DEV-${Date.now().toString(36).toUpperCase()}`,
    prazoDias: PRAZO_COMPROVANTE_DIAS,
    solicitadoEm: Date.now(),
    simulado: true,
  };
}

export async function solicitarExclusao(
  confirmacao: string,
  {
    assinaturaAtiva = false,
    cliente = apiClient,
    timeoutMs = TIMEOUT_REDE_MS,
    permitirSimulacao = emDesenvolvimento(),
    obterToken,
  }: ExclusaoOptions = {}
): Promise<ComprovanteExclusao> {
  if (!confirmacaoValida(confirmacao)) throw new ExclusaoError('FRASE_INVALIDA');
  if (assinaturaAtiva) throw new ExclusaoError('ASSINATURA_ATIVA');
  const titularId = await titularDaSessao({ obterToken });

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const pedido = await cliente.post<PedidoExclusao | undefined>(
      rotaExclusao(titularId),
      { confirmacao: FRASE_CONFIRMACAO } satisfies SolicitarExclusaoRequest,
      { signal: controlador.signal }
    );
    const comprovante = comprovanteDoContrato(pedido);
    if (!comprovante) throw new ExclusaoError('RESPOSTA_INVALIDA');
    return comprovante;
  } catch (erro) {
    if (erro instanceof ExclusaoError) throw erro;
    // O servidor respondeu e recusou (4xx): não se simula sucesso.
    if (foiRecusadoPeloServidor(erro)) throw new ExclusaoError('RECUSADO');
    console.warn('[exclusaoContaService] O servidor não concluiu o pedido.');
  } finally {
    clearTimeout(temporizador);
  }

  if (permitirSimulacao) return comprovanteSimulado();
  throw new ExclusaoError('SEM_CONEXAO');
}
