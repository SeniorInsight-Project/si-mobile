import { apiClient, ApiError, type ApiClient } from './apiClient';

/**
 * Central de Alertas do familiar (HU-034, HU-035, HU-037 / RN-010, RN-017, RN-019).
 *
 * - CRITICO e SOS nunca esperam, nem no silêncio noturno; ATENCAO e TECNICO esperam entre 22:00 e 07:00.
 * - Todo alerta crítico traz "não substitui avaliação médica" e sugere ligar para o idoso e, sem resposta, 192.
 * - Rotas conforme si-contracts#7 (notification-v1):
 *   GET /api/v1/notification/idosos/{id}/alertas
 *   PUT /api/v1/notification/idosos/{id}/alertas/{alertaId}/avaliacao
 */
export type TipoAlerta = 'SOS' | 'CRITICO' | 'ATENCAO' | 'TECNICO';
export type FiltroAlerta = 'TODOS' | 'CRITICOS' | 'ATENCAO' | 'TECNICOS';
export type Avaliacao = 'UTIL' | 'FALSO';

export const AVISO_NAO_DIAGNOSTICO = 'Informação de apoio ao cuidado; não substitui avaliação médica.';
export const TELEFONE_SAMU = '192';
export const JANELA_ALTERAR_AVALIACAO_MS = 24 * 60 * 60 * 1000;

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
  /** Ícone sugerido para alertas técnicos. */
  icone?: string;
}

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

export class AvaliacaoBloqueadaError extends Error {
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

function traduzir(erro: unknown, acao: string): AlertaError {
  if (erro instanceof ApiError && erro.erroDeRede) return new AlertaError('Sem internet. Conecte-se e tente de novo.');
  return new AlertaError(`Não foi possível ${acao} agora. Tente de novo.`);
}

function normalizarAlerta(d: any): Alerta {
  const geradoEm = typeof d?.geradoEm === 'string'
    ? new Date(d.geradoEm).getTime()
    : typeof d?.geradoEm === 'number'
      ? d.geradoEm
      : Date.now();
  const avaliadoEm = typeof d?.avaliadoEm === 'string'
    ? new Date(d.avaliadoEm).getTime()
    : typeof d?.avaliadoEm === 'number'
      ? d.avaliadoEm
      : undefined;

  return {
    id: d?.id ?? '',
    tipo: d?.tipo ?? 'TECNICO',
    titulo: d?.titulo ?? '',
    detalhe: d?.detalhe ?? undefined,
    geradoEm,
    avaliacao: d?.avaliacao ?? undefined,
    avaliadoEm,
    motivoAvaliacao: d?.motivoAvaliacao ?? undefined,
    icone: d?.icone ?? undefined,
  };
}

export async function listarAlertas(idosoId: string, { cliente = apiClient }: OpcoesRede = {}): Promise<Alerta[]> {
  try {
    const dados = await cliente.get<any[]>(`/api/v1/notification/idosos/${idosoId}/alertas`);
    return Array.isArray(dados) ? ordenarAlertas(dados.map(normalizarAlerta)) : [];
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
  try {
    await cliente.put(`/api/v1/notification/idosos/${idosoId}/alertas/${alerta.id}/avaliacao`, {
      avaliacao: alerta.avaliacao,
      motivo: alerta.motivoAvaliacao ?? '',
    });
  } catch (erro) {
    throw traduzir(erro, 'salvar sua resposta');
  }
}
