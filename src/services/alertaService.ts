import { apiClient, ApiError, type ApiClient } from './apiClient';
import {
  AlertaInvalidoError,
  alertaDoContrato,
  avaliacaoParaContrato,
  type Alerta,
  type Avaliacao,
  type TipoAlerta,
} from './mappers/alertas';
import type { AlertaApi } from '../types/api';

export type { Alerta, Avaliacao, TipoAlerta };

/**
 * Central de Alertas do familiar (HU-034, HU-035, HU-037 / RN-010, RN-017, RN-019).
 *
 * - CRITICO e SOS nunca esperam, nem no silêncio noturno; ATENCAO e TECNICO esperam entre 22:00 e 07:00.
 * - Todo alerta crítico traz "não substitui avaliação médica" e sugere ligar para o idoso e, sem resposta, 192.
 * - Rotas do notification-v1 pelo gateway: GET /api/v1/notification/idosos/{id}/alertas e
 *   PUT .../alertas/{alertaId}/avaliacao. Se falhar, a tela mostra o erro; não há alerta de exemplo.
 */
export type FiltroAlerta = 'TODOS' | 'CRITICOS' | 'ATENCAO' | 'TECNICOS';

export const AVISO_NAO_DIAGNOSTICO = 'Informação de apoio ao cuidado; não substitui avaliação médica.';
export const TELEFONE_SAMU = '192';
export const JANELA_ALTERAR_AVALIACAO_MS = 24 * 60 * 60 * 1000;

export class AlertaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'AlertaError';
  }
}

const ORDEM_GRAVIDADE: Record<TipoAlerta, number> = { SOS: 0, CRITICO: 1, ATENCAO: 2, TECNICO: 3 };

export function filtrarAlertas(alertas: Alerta[], filtro: FiltroAlerta): Alerta[] {
  switch (filtro) {
    case 'CRITICOS':
      return alertas.filter((a) => a.tipo === 'CRITICO' || a.tipo === 'SOS');
    case 'ATENCAO':
      return alertas.filter((a) => a.tipo === 'ATENCAO');
    case 'TECNICOS':
      return alertas.filter((a) => a.tipo === 'TECNICO');
    default:
      return [...alertas];
  }
}

/** Mais grave primeiro; dentro da mesma gravidade, o mais recente primeiro. */
export function ordenarAlertas(alertas: Alerta[]): Alerta[] {
  return [...alertas].sort(
    (a, b) => ORDEM_GRAVIDADE[a.tipo] - ORDEM_GRAVIDADE[b.tipo] || b.geradoEm - a.geradoEm
  );
}

/** RN-010: Crítico e SOS nunca esperam; Atenção e técnicos esperam das 22:00 às 07:00. */
export function deveEsperarSilencio(tipo: TipoAlerta, hora: number): boolean {
  if (tipo === 'CRITICO' || tipo === 'SOS') return false;
  return hora >= 22 || hora < 7;
}

export function formatarHoraAlerta(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** HU-037 cenário 2: a avaliação pode ser alterada em até 24 h. */
export function podeAlterarAvaliacao(avaliadoEm: number | undefined, agora: number = Date.now()): boolean {
  if (avaliadoEm === undefined) return true;
  return agora - avaliadoEm <= JANELA_ALTERAR_AVALIACAO_MS;
}

export class AvaliacaoBloqueadaError extends AlertaError {
  constructor() {
    super('O prazo de 24 h para alterar a avaliação já passou.');
    this.name = 'AvaliacaoBloqueadaError';
  }
}

/** Aplica a avaliação (HU-037). Devolve uma cópia; lança se o prazo de alteração já venceu. */
export function aplicarAvaliacao(
  alerta: Alerta,
  avaliacao: Avaliacao,
  motivo = '',
  agora: number = Date.now()
): Alerta {
  if (!podeAlterarAvaliacao(alerta.avaliadoEm, agora)) throw new AvaliacaoBloqueadaError();
  return {
    ...alerta,
    avaliacao,
    avaliadoEm: alerta.avaliadoEm ?? agora,
    motivoAvaliacao: avaliacao === 'FALSO' ? motivo.trim() : '',
  };
}

export interface OpcoesRede {
  cliente?: Pick<ApiClient, 'get' | 'put'>;
}

const STATUS_PRAZO_VENCIDO = 409;

export function rotaAlertas(idosoId: string): string {
  return `/api/v1/notification/idosos/${idosoId}/alertas`;
}

export function rotaAvaliacao(idosoId: string, alertaId: string): string {
  return `${rotaAlertas(idosoId)}/${alertaId}/avaliacao`;
}

function traduzir(erro: unknown, acao: string): AlertaError {
  if (erro instanceof AlertaError) return erro;
  if (erro instanceof AlertaInvalidoError) return new AlertaError(erro.message);
  if (erro instanceof ApiError && erro.erroDeRede) return new AlertaError('Sem internet. Conecte-se e tente de novo.');
  if (erro instanceof ApiError && erro.status === STATUS_PRAZO_VENCIDO) return new AvaliacaoBloqueadaError();
  return new AlertaError(`Não foi possível ${acao} agora. Tente de novo.`);
}

export async function listarAlertas(idosoId: string, { cliente = apiClient }: OpcoesRede = {}): Promise<Alerta[]> {
  try {
    const dados = await cliente.get<AlertaApi[]>(rotaAlertas(idosoId));
    return Array.isArray(dados) ? ordenarAlertas(dados.map(alertaDoContrato)) : [];
  } catch (erro) {
    throw traduzir(erro, 'carregar os alertas');
  }
}

/** Envia a avaliação. Se falhar, lança: quem chama desfaz a marcação na tela (não fica só no aparelho). */
export async function enviarAvaliacao(
  idosoId: string,
  alerta: Alerta,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<void> {
  if (!alerta.avaliacao) throw new AlertaError('Escolha "Foi útil" ou "Alarme falso" antes de enviar.');
  try {
    await cliente.put(
      rotaAvaliacao(idosoId, alerta.id),
      avaliacaoParaContrato(alerta.avaliacao, alerta.motivoAvaliacao)
    );
  } catch (erro) {
    throw traduzir(erro, 'salvar sua resposta');
  }
}
