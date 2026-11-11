import type { AlertaApi, AvaliarAlertaRequest } from '../../types/api';

/**
 * Camada anticorrupção do contexto de alertas: traduz Alerta e AvaliarAlertaRequest do notification-v1
 * para o modelo do app. As datas chegam em ISO e viram epoch ms; data inválida é dado inválido e nunca
 * é trocada pela hora de agora, para um alerta antigo não parecer novo.
 */
export type TipoAlerta = AlertaApi['tipo'];
export type Avaliacao = NonNullable<AlertaApi['avaliacao']>;

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  detalhe?: string;
  /** Epoch ms de quando o alerta foi gerado. */
  geradoEm: number;
  avaliacao?: Avaliacao;
  avaliadoEm?: number;
  motivoAvaliacao?: string;
}

export class AlertaInvalidoError extends Error {
  constructor(campo: string) {
    super(`O alerta chegou com ${campo} inválido.`);
    this.name = 'AlertaInvalidoError';
  }
}

function epochMs(iso: unknown, campo: string): number {
  const ms = typeof iso === 'string' ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ms)) throw new AlertaInvalidoError(campo);
  return ms;
}

const textoOuAusente = (valor: string | null | undefined): string | undefined => valor ?? undefined;

export function alertaDoContrato(dto: AlertaApi): Alerta {
  return {
    id: dto.id,
    tipo: dto.tipo,
    titulo: dto.titulo,
    detalhe: textoOuAusente(dto.detalhe),
    geradoEm: epochMs(dto.geradoEm, 'geradoEm'),
    avaliacao: dto.avaliacao ?? undefined,
    avaliadoEm: dto.avaliadoEm == null ? undefined : epochMs(dto.avaliadoEm, 'avaliadoEm'),
    motivoAvaliacao: textoOuAusente(dto.motivoAvaliacao),
  };
}

/** Corpo do PUT da avaliação; o motivo só vai quando há texto. */
export function avaliacaoParaContrato(avaliacao: Avaliacao, motivo: string | undefined): AvaliarAlertaRequest {
  return motivo ? { avaliacao, motivo } : { avaliacao };
}
