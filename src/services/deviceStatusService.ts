import { mockPermitido } from '../config/ambiente';
import { apiClient } from './apiClient';
import { statusDoContrato, type StatusDispositivoLido } from './mappers/telemetria';
import { exigirIdoso, lerTelemetria, rotaStatusAparelho, type ClienteTelemetria } from './telemetriaApi';
import type { StatusAparelhoApi } from '../types/api';

export type { SensorDispositivo } from './mappers/telemetria';

const MENSAGEM_FALHA = 'Não foi possível obter o status do dispositivo.';

/** Bateria nesse nível ou abaixo vira aviso para o familiar (HU-027). */
export const LIMITE_BATERIA_BAIXA = 20;

/** Status do celular coletor do idoso (HU-027), como o telemetry-v1 informa. */
export type StatusDispositivo = StatusDispositivoLido;

export interface ResultadoPerdaDados {
  semDados: boolean;
  mensagem: string;
  minutosAtraso: number;
  horarioPerda: string;
}

/**
 * Formata um timestamp ISO em horário legível HH:mm
 */
export function formatarHora(dataISO?: string | Date | null): string {
  if (!dataISO) return '--:--';
  const data = new Date(dataISO);
  if (isNaN(data.getTime())) return '--:--';
  const horas = String(data.getHours()).padStart(2, '0');
  const minutos = String(data.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

/**
 * Gera o texto canônico de status conforme Cenário 1 da HU-027:
 * "Última atualização 10:15, bateria 62%"
 */
export function formatarResumoStatus(
  status: Pick<StatusDispositivo, 'ultimaSincronizacao' | 'nivelBateria'> | null | undefined
): string {
  if (!status) return 'Status indisponível';
  const hora = formatarHora(status.ultimaSincronizacao);
  const bateria = typeof status.nivelBateria === 'number' ? `${status.nivelBateria}%` : '--%';
  return `Última atualização ${hora}, bateria ${bateria}`;
}

/**
 * Avalia se há ausência de sincronização há mais de X horas (conforme HU-028 e RN-003).
 * Limiar diurno padrão: 3 horas (180 minutos).
 */
export function verificarPerdaDados(
  ultimaSincronizacao: string | null | undefined,
  nomeIdoso = 'Idoso',
  limiteHoras = 3,
  dataReferencia: Date = new Date()
): ResultadoPerdaDados {
  if (!ultimaSincronizacao) {
    return {
      semDados: true,
      mensagem: `Sem dados recentes de ${nomeIdoso}. Verifique o celular dela.`,
      minutosAtraso: Infinity,
      horarioPerda: '--:--',
    };
  }

  const syncDate = new Date(ultimaSincronizacao);
  if (isNaN(syncDate.getTime())) {
    return {
      semDados: true,
      mensagem: `Sem dados recentes de ${nomeIdoso}. Verifique o celular dela.`,
      minutosAtraso: Infinity,
      horarioPerda: '--:--',
    };
  }

  const diffMs = dataReferencia.getTime() - syncDate.getTime();
  const minutosAtraso = Math.floor(diffMs / (1000 * 60));
  const limiteMinutos = limiteHoras * 60;
  const horarioPerda = formatarHora(syncDate);

  if (minutosAtraso >= limiteMinutos) {
    return {
      semDados: true,
      minutosAtraso,
      horarioPerda,
      mensagem: `Sem dados de ${nomeIdoso} desde ${horarioPerda}. Verifique o celular dela.`,
    };
  }

  return {
    semDados: false,
    minutosAtraso,
    horarioPerda,
    mensagem: `Sincronização em dia (última às ${horarioPerda})`,
  };
}

/** Só com mock permitido (dev): devolve o StatusAparelho de demonstração no formato do contrato. */
async function statusDeDemonstracao(idosoId?: string): Promise<StatusAparelhoApi> {
  const { STATUS_DISPOSITIVO_MOCK } = await import('../mocks/deviceStatus');
  const { IDOSO_DEMONSTRACAO } = await import('../mocks/telemetria');
  return (idosoId && STATUS_DISPOSITIVO_MOCK[idosoId]) || { ...STATUS_DISPOSITIVO_MOCK[IDOSO_DEMONSTRACAO], idosoId: idosoId ?? IDOSO_DEMONSTRACAO };
}

/**
 * Status do celular do idoso em GET /api/v1/telemetry/idosos/{id}/status.
 * Falha vira TelemetriaError.
 */
export async function buscarStatusDispositivo(
  idosoId: string,
  { cliente = apiClient }: { cliente?: ClienteTelemetria } = {}
): Promise<StatusDispositivo> {
  if (!idosoId && mockPermitido()) return statusDoContrato(await statusDeDemonstracao());
  const id = exigirIdoso(idosoId);
  try {
    return statusDoContrato(await lerTelemetria<StatusAparelhoApi>(cliente, rotaStatusAparelho(id), MENSAGEM_FALHA));
  } catch (erro) {
    // Sem mock permitido a falha sobe para a tela; com mock (só em dev) cai nos dados de demonstração.
    if (!mockPermitido()) throw erro;
    return statusDoContrato(await statusDeDemonstracao(id));
  }
}
