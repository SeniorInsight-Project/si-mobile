import { runtimeConfig } from '../config/runtime';
import { mockPermitido } from '../config/ambiente';
import { formatarHora } from './deviceStatusService';
import { resolverTokenAutorizacao } from './tokenStorageService';

interface EstadoAtualBruto {
  idosoId: string;
  nomeIdoso?: string;
  passosHoje: number;
  metaPassos: number;
  frequenciaCardiaca: number;
  frequenciaCardiacaRepouso?: number;
  statusCardiovascular?: string;
  coletadoEm: string | null;
}

export interface EstadoAtual {
  idosoId: string;
  nomeIdoso: string;
  passosHoje: number;
  metaPassos: number;
  progressoPassos: number;
  frequenciaCardiaca: number;
  frequenciaCardiacaRepouso: number;
  statusCardiovascular: string;
  coletadoEm: string | null;
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

/**
 * Busca o estado atual biométrico (passos, batimentos, horário de atualização)
 * do idoso no backend ou fallback mock.
 */
export async function buscarEstadoAtual(
  idosoId: string,
  token: string | null = null
): Promise<EstadoAtual> {
  if (!idosoId) {
    if (mockPermitido()) {
      const { ESTADO_ATUAL_MOCK } = await import('../mocks/telemetria');
      return normalizarEstadoAtual(ESTADO_ATUAL_MOCK['e3b0c442-98fc-1c14-9afc-432100000001'] as EstadoAtualBruto);
    }
    throw new Error('ID do idoso não informado.');
  }

  try {
    const url = `${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/telemetria-wearable/recente`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return normalizarEstadoAtualFromApi(idosoId, data);
    }
  } catch {
    // Fallback silencioso para ambiente de desenvolvimento com mock ativado
  }

  if (mockPermitido()) {
    const { ESTADO_ATUAL_MOCK } = await import('../mocks/telemetria');
    const mock = ESTADO_ATUAL_MOCK[idosoId] || {
      ...ESTADO_ATUAL_MOCK['e3b0c442-98fc-1c14-9afc-432100000001'],
      idosoId,
    };
    return normalizarEstadoAtual(mock as EstadoAtualBruto);
  }

  throw new Error(`Não foi possível carregar dados de telemetria do idoso.`);
}

function normalizarEstadoAtual(data: EstadoAtualBruto): EstadoAtual {
  const analiseRecente = verificarDadosRecentes(data.coletadoEm);
  const progresso = data.metaPassos > 0 ? Math.min(1, data.passosHoje / data.metaPassos) : 0;

  return {
    idosoId: data.idosoId,
    nomeIdoso: data.nomeIdoso || 'Idoso Monitorado',
    passosHoje: data.passosHoje,
    metaPassos: data.metaPassos || 4000,
    progressoPassos: progresso,
    frequenciaCardiaca: data.frequenciaCardiaca,
    frequenciaCardiacaRepouso: data.frequenciaCardiacaRepouso || 64,
    statusCardiovascular: data.statusCardiovascular || 'Normal',
    coletadoEm: data.coletadoEm,
    atualizadoAs: formatarHora(data.coletadoEm),
    textoAtualizacao: analiseRecente.textoAtualizacao,
    semDadosRecentes: analiseRecente.semDadosRecentes,
  };
}

function normalizarEstadoAtualFromApi(idosoId: string, apiData: Record<string, any>): EstadoAtual {
  const coletado = apiData.coletado_em || apiData.criado_em || null;
  const analiseRecente = verificarDadosRecentes(coletado);

  const passos = typeof apiData.passos_contagem === 'number' ? apiData.passos_contagem : 0;
  const bpm = typeof apiData.frequencia_cardiaca_bpm === 'number' ? apiData.frequencia_cardiaca_bpm : 0;
  const bpmRepouso = typeof apiData.frequencia_cardiaca_repouso_bpm === 'number'
    ? apiData.frequencia_cardiaca_repouso_bpm
    : 64;

  const meta = 4000;
  const progresso = meta > 0 ? Math.min(1, passos / meta) : 0;

  return {
    idosoId,
    nomeIdoso: 'Idoso Monitorado',
    passosHoje: passos,
    metaPassos: meta,
    progressoPassos: progresso,
    frequenciaCardiaca: bpm,
    frequenciaCardiacaRepouso: bpmRepouso,
    statusCardiovascular: bpm > 100 ? 'Atenção' : 'Estável',
    coletadoEm: coletado,
    atualizadoAs: formatarHora(coletado),
    textoAtualizacao: analiseRecente.textoAtualizacao,
    semDadosRecentes: analiseRecente.semDadosRecentes,
  };
}
