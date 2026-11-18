/**
 * Acompanhamento do idoso pelo familiar (aba "Acompanhar"): só leitura.
 * O familiar vê o status do relógio, os últimos SOS e liga para o idoso, mas nunca dispara SOS em nome dele.
 */
import { apiClient } from './apiClient';
import { mapearAlarme, SosError, type AlarmeApi, type AlarmeRecebido, type OpcoesRede, type StatusSos } from './sosRecebidoService';
import type { StatusRelogioIdoso } from './relogioStatusService';

export const ROTULO_STATUS_SOS: Record<StatusSos, string> = {
  DISPARADO: 'Aguardando atendimento',
  EM_ATENDIMENTO: 'Em atendimento',
  RESOLVIDO: 'Resolvido',
  CANCELADO: 'Cancelado (foi engano)',
};

export function sosEmAberto(alarme: Pick<AlarmeRecebido, 'status'>): boolean {
  return alarme.status === 'DISPARADO' || alarme.status === 'EM_ATENDIMENTO';
}

/** Últimos SOS do idoso (GET /api/v1/idosos/{id}/sos), do mais recente para o mais antigo. */
export async function listarUltimosSos(
  idosoId: string,
  { cliente = apiClient, limite = 5 }: OpcoesRede & { limite?: number } = {}
): Promise<AlarmeRecebido[]> {
  let lista: AlarmeApi[];
  try {
    lista = await cliente.get<AlarmeApi[]>(`/api/v1/idosos/${encodeURIComponent(idosoId)}/sos`);
  } catch {
    throw new SosError('Não foi possível carregar os pedidos de socorro agora.');
  }
  return (Array.isArray(lista) ? lista : [])
    .map(mapearAlarme)
    .sort((a, b) => (b.disparadoEm || 0) - (a.disparadoEm || 0))
    .slice(0, limite);
}

/** Texto do status do relógio na visão do familiar (o de relogioStatusService fala com o idoso). */
export function resumoRelogioParaFamilia(
  status: Pick<StatusRelogioIdoso, 'funcionando' | 'minutosDesdeSincronizacao'>,
  nomeIdoso: string
): { titulo: string; subtitulo: string } {
  const nome = nomeIdoso.trim() || 'o idoso';
  const min = status.minutosDesdeSincronizacao;
  if (status.funcionando) {
    return { titulo: 'Relógio enviando dados', subtitulo: min < 1 ? 'Sincronizado agora' : `Sincronizado há ${min} min` };
  }
  return {
    titulo: 'Relógio sem enviar dados',
    subtitulo: Number.isFinite(min)
      ? `Último envio há ${min >= 60 ? `${Math.floor(min / 60)} h` : `${min} min`}. Confira com ${nome}.`
      : `Nenhum envio registrado. Confira com ${nome}.`,
  };
}

/** Telefone do idoso pronto para `tel:`, ou null quando não há (o contrato do care ainda não tem esse campo). */
export function telefoneDoIdoso(celular?: string | null): string | null {
  const digitos = (celular ?? '').replace(/\D/g, '');
  return digitos.length >= 8 ? digitos : null;
}
