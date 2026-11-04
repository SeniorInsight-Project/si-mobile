import { apiClient, ApiClient, ApiError } from './apiClient';

/**
 * SOS recebido pelo familiar (HU-065, HU-066, HU-068 / RN-009, RN-002), pelo contrato care-v1:
 *   GET /api/v1/sos/{alarmeId}, GET /api/v1/idosos/{idosoId}/sos e PUT /api/v1/sos/{alarmeId}/status.
 *
 * O estado do chamado é SEMPRE o do servidor: "Estou a caminho" só vale depois que o PUT responde, e quem
 * chega depois vê que o chamado já está em atendimento. O contrato não diz QUEM assumiu nem tem "Também vou";
 * ambos dependem de campos/rotas novas (ver o PR).
 */
export type StatusSos = 'DISPARADO' | 'EM_ATENDIMENTO' | 'RESOLVIDO' | 'CANCELADO';
export type DesfechoSos = 'ATENDIDO' | 'SOCORRO_MEDICO' | 'FOI_ENGANO';
export type ResultadoAssumir = 'ASSUMIDO' | 'JA_ASSUMIDO' | 'ENCERRADO';

export const ROTULOS_DESFECHO: Record<DesfechoSos, string> = {
  ATENDIDO: 'Atendido',
  SOCORRO_MEDICO: 'Socorro médico',
  FOI_ENGANO: 'Foi engano',
};

export interface AlarmeApi {
  id: string;
  idosoId: string;
  nomeIdoso?: string;
  latitude?: number | null;
  longitude?: number | null;
  status: StatusSos;
  observacao?: string | null;
  criadoEm: string;
  atualizadoEm?: string | null;
}

export interface LocalizacaoSos {
  latitude: number;
  longitude: number;
  medidaEm: number;
}

export interface AlarmeRecebido {
  id: string;
  idosoId: string;
  idosoNome: string;
  disparadoEm: number;
  status: StatusSos;
  /** null quando o celular não obteve localização (HU-065 cenário 2). */
  localizacao: LocalizacaoSos | null;
}

export class SosError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'SosError';
  }
}

const STATUS_ATIVOS: StatusSos[] = ['DISPARADO', 'EM_ATENDIMENTO'];

export function mapearAlarme(a: AlarmeApi): AlarmeRecebido {
  const temLocal = typeof a.latitude === 'number' && typeof a.longitude === 'number';
  return {
    id: a.id,
    idosoId: a.idosoId,
    idosoNome: a.nomeIdoso?.trim() || 'O idoso',
    disparadoEm: Date.parse(a.criadoEm),
    status: a.status,
    localizacao: temLocal
      ? { latitude: a.latitude as number, longitude: a.longitude as number, medidaEm: Date.parse(a.criadoEm) }
      : null,
  };
}

const hora = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** O contrato não traz endereço nem precisão: mostra as coordenadas e a hora (HU-065 cenário 2 sem localização). */
export function descreverLocalizacao(alarme: AlarmeRecebido): { disponivel: boolean; titulo: string; detalhe: string } {
  if (alarme.localizacao) {
    const l = alarme.localizacao;
    return {
      disponivel: true,
      titulo: 'Localização no momento do pedido',
      detalhe: `${l.latitude.toFixed(4)}, ${l.longitude.toFixed(4)} • ${hora(l.medidaEm)}`,
    };
  }
  return {
    disponivel: false,
    titulo: 'Localização indisponível',
    detalhe: `Ligue para ${alarme.idosoNome} ou para o contato de emergência.`,
  };
}

/** Estado final no servidor: Atendido e Socorro médico encerram como RESOLVIDO; Foi engano como CANCELADO. */
export function statusDoDesfecho(desfecho: DesfechoSos): StatusSos {
  return desfecho === 'FOI_ENGANO' ? 'CANCELADO' : 'RESOLVIDO';
}

export interface OpcoesRede {
  cliente?: Pick<ApiClient, 'get' | 'put'>;
}

function traduzir(erro: unknown, acao: string): SosError {
  if (erro instanceof ApiError) {
    if (erro.erroDeRede) return new SosError('Sem internet. Se for urgente, ligue agora.');
    if (erro.status === 404) return new SosError('Este chamado não foi encontrado.');
  }
  return new SosError(`Não foi possível ${acao} agora. Tente de novo ou ligue.`);
}

export async function buscarAlarme(alarmeId: string, { cliente = apiClient }: OpcoesRede = {}): Promise<AlarmeRecebido> {
  try {
    return mapearAlarme(await cliente.get<AlarmeApi>(`/api/v1/sos/${alarmeId}`));
  } catch (erro) {
    throw traduzir(erro, 'carregar o chamado');
  }
}

/** O chamado em aberto mais recente do idoso, ou null se não há. */
export async function buscarAlarmeAtivo(idosoId: string, { cliente = apiClient }: OpcoesRede = {}): Promise<AlarmeRecebido | null> {
  try {
    const lista = await cliente.get<AlarmeApi[]>(`/api/v1/idosos/${idosoId}/sos`);
    const ativo = (Array.isArray(lista) ? lista : []).find((a) => STATUS_ATIVOS.includes(a.status));
    return ativo ? mapearAlarme(ativo) : null;
  } catch (erro) {
    throw traduzir(erro, 'carregar o chamado');
  }
}

/**
 * RN-009: o primeiro a assumir ganha. Relê o chamado antes: se já está em atendimento (ou encerrado),
 * não assume por cima. A decisão final continua sendo do servidor.
 */
export async function assumirChamado(
  alarmeId: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<{ alarme: AlarmeRecebido; resultado: ResultadoAssumir }> {
  try {
    const atual = mapearAlarme(await cliente.get<AlarmeApi>(`/api/v1/sos/${alarmeId}`));
    if (atual.status === 'EM_ATENDIMENTO') return { alarme: atual, resultado: 'JA_ASSUMIDO' };
    if (atual.status !== 'DISPARADO') return { alarme: atual, resultado: 'ENCERRADO' };

    const atualizado = mapearAlarme(
      await cliente.put<AlarmeApi>(`/api/v1/sos/${alarmeId}/status`, {
        status: 'EM_ATENDIMENTO',
        observacao: 'Assumido por um familiar',
      })
    );
    return { alarme: atualizado, resultado: 'ASSUMIDO' };
  } catch (erro) {
    throw traduzir(erro, 'assumir o chamado');
  }
}

/** HU-068: encerra com um desfecho formal (vai na observação; o contrato não tem campo próprio). */
export async function encerrarChamado(
  alarmeId: string,
  desfecho: DesfechoSos,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<AlarmeRecebido> {
  if (!(desfecho in ROTULOS_DESFECHO)) throw new SosError('Escolha um desfecho para encerrar.');
  try {
    return mapearAlarme(
      await cliente.put<AlarmeApi>(`/api/v1/sos/${alarmeId}/status`, {
        status: statusDoDesfecho(desfecho),
        observacao: `Desfecho: ${ROTULOS_DESFECHO[desfecho]}`,
      })
    );
  } catch (erro) {
    throw traduzir(erro, 'encerrar o chamado');
  }
}
