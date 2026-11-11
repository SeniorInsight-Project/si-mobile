import { mockPermitido } from '../config/ambiente';
import { formatarHora } from './deviceStatusService';
import { apiClient } from './apiClient';
import { estadoAtualDoContrato, type EstadoAtualLido } from './mappers/telemetria';
import { exigirIdoso, lerTelemetria, rotaEstadoAtual, type ClienteTelemetria } from './telemetriaApi';
import type { EstadoAtualApi } from '../types/api';

const MENSAGEM_FALHA = 'Não foi possível carregar dados de telemetria do idoso.';

/** Estado de hoje do telemetry-v1 mais o resumo de atualização que a tela mostra (HU-030, HU-031). */
export interface EstadoAtual extends EstadoAtualLido {
  atualizadoAs: string;
  textoAtualizacao: string;
  semDadosRecentes: boolean;
}

export interface AnaliseDadosRecentes {
  semDadosRecentes: boolean;
  textoAtualizacao: string;
  horasSemDados: number;
}

/**
 * Avalia se os dados foram coletados há menos ou mais de 48 horas (HU-031).
 * Cenário 1: "Atualizado às HH:MM"
 * Cenário 2: Se > 48 horas, "Sem dados recentes" em vez dos números
 */
export function verificarDadosRecentes(
  coletadoEm: string | null | undefined,
  limiteHoras = 48,
  dataReferencia: Date = new Date()
): AnaliseDadosRecentes {
  if (!coletadoEm) {
    return {
      semDadosRecentes: true,
      textoAtualizacao: 'Sem dados recentes',
      horasSemDados: Infinity,
    };
  }

  const dataColeta = new Date(coletadoEm);
  if (isNaN(dataColeta.getTime())) {
    return {
      semDadosRecentes: true,
      textoAtualizacao: 'Sem dados recentes',
      horasSemDados: Infinity,
    };
  }

  const diffMs = dataReferencia.getTime() - dataColeta.getTime();
  const horasSemDados = diffMs / (1000 * 60 * 60);

  if (horasSemDados > limiteHoras) {
    return {
      semDadosRecentes: true,
      textoAtualizacao: 'Sem dados recentes',
      horasSemDados,
    };
  }

  const horaFormatada = formatarHora(dataColeta);
  return {
    semDadosRecentes: false,
    textoAtualizacao: `Atualizado às ${horaFormatada}`,
    horasSemDados,
  };
}

/** Só com mock permitido (dev): devolve o EstadoAtual de demonstração no formato do contrato. */
async function estadoDeDemonstracao(idosoId?: string): Promise<EstadoAtualApi> {
  const { ESTADO_ATUAL_MOCK, IDOSO_DEMONSTRACAO } = await import('../mocks/telemetria');
  return (idosoId && ESTADO_ATUAL_MOCK[idosoId]) || { ...ESTADO_ATUAL_MOCK[IDOSO_DEMONSTRACAO], idosoId: idosoId ?? IDOSO_DEMONSTRACAO };
}

function montarEstadoAtual(dto: EstadoAtualApi): EstadoAtual {
  const estado = estadoAtualDoContrato(dto);
  const recente = verificarDadosRecentes(estado.coletadoEm);
  return {
    ...estado,
    atualizadoAs: formatarHora(estado.coletadoEm),
    textoAtualizacao: recente.textoAtualizacao,
    semDadosRecentes: recente.semDadosRecentes,
  };
}

/**
 * Estado atual do idoso (passos, batimentos, hora da última leitura) em
 * GET /api/v1/telemetry/idosos/{id}/hoje. Falha vira TelemetriaError.
 */
export async function buscarEstadoAtual(
  idosoId: string,
  { cliente = apiClient }: { cliente?: ClienteTelemetria } = {}
): Promise<EstadoAtual> {
  if (!idosoId && mockPermitido()) return montarEstadoAtual(await estadoDeDemonstracao());
  const id = exigirIdoso(idosoId);
  try {
    return montarEstadoAtual(await lerTelemetria<EstadoAtualApi>(cliente, rotaEstadoAtual(id), MENSAGEM_FALHA));
  } catch (erro) {
    // Sem mock permitido a falha sobe para a tela; com mock (só em dev) cai nos dados de demonstração.
    if (!mockPermitido()) throw erro;
    return montarEstadoAtual(await estadoDeDemonstracao(id));
  }
}
