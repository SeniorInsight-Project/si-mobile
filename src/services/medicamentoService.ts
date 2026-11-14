import { mockPermitido } from '../config/ambiente';
import type { AtualizarRotinaRequest, ConfirmarIngestaoRequest, RotinaMedicamentoRequest } from '../types/api';
import { apiClient, ApiError, type ApiClient } from './apiClient';
import {
  obterRotinasDoCache,
  salvarRotinasNoCache,
  atualizarStatusDoseCache,
  removerRotinaCache,
} from './medicamentoDatabase';
import { agendarLembretesMedicacao } from './notificacaoMedicamentoService';

export interface RotinaMedicamento {
  id: string;
  idosoId?: string;
  idosoNome?: string;
  medicamentoId?: string;
  medicamentoNome: string;
  nomeMedicamento?: string;
  dosagem: string;
  instrucoes: string;
  observacoes?: string;
  horario: string;
  frequencia: string;
  diasSemana?: string;
  tipoFormato: string;
  ativo: boolean;
  statusHoje: string;
  horarioIngestaoHoje: string | null;
  isProximo: boolean;
  iconeTipo: string;
  corIcone: string;
  corFundoThumb: string;
  thumbEmoji: string;
}

export type RotinaMedicamentoInput = Partial<RotinaMedicamento>;

/** ConfirmarIngestaoRequest do contrato care-v1. */
export type ConfirmacaoIngestaoInput = ConfirmarIngestaoRequest;

export interface ConfirmacaoIngestaoResponse {
  rotinaId: string;
  status: string;
  dataHoraIngestao: string | null;
  observacao: string;
  horarioIngestaoHoje?: string | null;
  sucesso?: boolean;
  [key: string]: any;
}

// Estado local em memória para garantir consistência nas operações offline/mock
let localMedicinesStore: RotinaMedicamento[] = [];
let inicializadoMedicamentos = false;

async function garantirRotinasIniciais(): Promise<void> {
  if (inicializadoMedicamentos) return;
  inicializadoMedicamentos = true;
  if (mockPermitido()) {
    const { INITIAL_MEDICINES } = await import('../mocks/medicamentos');
    localMedicinesStore = (INITIAL_MEDICINES as unknown as RotinaMedicamento[]).map(enriquecerDadosVisuais);
  }
}

/**
 * Auxiliar para enriquecer objetos de rotina com dados visuais (ícones, emojis e cores de thumbnail)
 */
export function enriquecerDadosVisuais(rotina: Partial<RotinaMedicamento> & Record<string, any>): RotinaMedicamento {
  const nome = rotina.medicamentoNome || rotina.nomeMedicamento || '';
  const nomeLower = nome.toLowerCase();
  const dosagemLower = (rotina.dosagem || '').toLowerCase();
  const instrucoesLower = (rotina.instrucoes || '').toLowerCase();

  let thumbEmoji = '💊';
  let corFundoThumb = '#EBF3FE';
  let tipoFormato = rotina.tipoFormato || 'comprimido';

  if (nomeLower.includes('xarope') || dosagemLower.includes('ml') || dosagemLower.includes('copo') || tipoFormato === 'xarope') {
    thumbEmoji = '🧴';
    corFundoThumb = '#FEF3EC';
    tipoFormato = 'xarope';
  } else if (nomeLower.includes('colírio') || nomeLower.includes('colirio') || dosagemLower.includes('gota') || instrucoesLower.includes('olho') || tipoFormato === 'gotas') {
    thumbEmoji = '💧';
    corFundoThumb = '#F4EEFD';
    tipoFormato = 'gotas';
  } else if (nomeLower.includes('insulina') || nomeLower.includes('inje') || dosagemLower.includes('ui') || tipoFormato === 'injecao') {
    thumbEmoji = '💉';
    corFundoThumb = '#FEE2E2';
    tipoFormato = 'injecao';
  } else if (nomeLower.includes('enalapril') || nomeLower.includes('verde') || tipoFormato === 'comprimido') {
    thumbEmoji = '💊';
    corFundoThumb = '#E8F8F0';
    tipoFormato = 'comprimido';
  }

  const horario = rotina.horario || '08:00';
  const horaNum = parseInt(horario.split(':')[0], 10) || 8;

  let iconeTipo = 'clock';
  let corIcone = '#F59E0B';

  const statusHoje = (rotina.statusHoje || 'PENDENTE').toUpperCase();

  if (statusHoje === 'TOMADO') {
    iconeTipo = 'check';
    corIcone = '#10B981';
    corFundoThumb = '#E8F8F0';
  } else if (statusHoje === 'ATRASADO') {
    iconeTipo = 'clock';
    corIcone = '#EF4444';
    corFundoThumb = '#FFEBE5';
  } else if (horaNum < 12) {
    iconeTipo = 'sun';
    corIcone = '#D97706';
  } else if (horaNum < 18) {
    iconeTipo = 'sun';
    corIcone = '#9A3412';
  } else {
    iconeTipo = 'moon';
    corIcone = '#5B21B6';
  }

  return {
    id: rotina.id || `rotina-${Date.now()}`,
    idosoId: rotina.idosoId,
    idosoNome: rotina.idosoNome,
    medicamentoId: rotina.medicamentoId,
    medicamentoNome: nome,
    nomeMedicamento: nome,
    dosagem: rotina.dosagem || '',
    instrucoes: rotina.instrucoes || '',
    observacoes: rotina.observacoes || '',
    horario,
    frequencia: rotina.frequencia || '1x ao dia (Diário)',
    diasSemana: rotina.diasSemana || 'TODOS',
    tipoFormato,
    ativo: rotina.ativo !== undefined ? Boolean(rotina.ativo) : true,
    statusHoje,
    horarioIngestaoHoje: rotina.horarioIngestaoHoje || null,
    isProximo: Boolean(rotina.isProximo),
    iconeTipo,
    corIcone,
    corFundoThumb,
    thumbEmoji,
  };
}

/**
 * Normaliza objetos retornados pela API (RotinaMedicamento do contrato care-v1).
 */
export function normalizarRotinaApi(apiItem: Record<string, any>): RotinaMedicamento {
  const statusContrato = String(apiItem.statusHoje ?? apiItem.status ?? 'PENDENTE').toUpperCase();

  return enriquecerDadosVisuais({
    id: apiItem.id,
    idosoId: apiItem.idosoId,
    idosoNome: apiItem.idosoNome,
    medicamentoId: apiItem.medicamentoId,
    medicamentoNome: apiItem.medicamentoNome,
    nomeMedicamento: apiItem.medicamentoNome,
    dosagem: apiItem.dosagem,
    instrucoes: apiItem.instrucoes,
    observacoes: apiItem.observacoes,
    horario: apiItem.horario,
    diasSemana: apiItem.diasSemana,
    frequencia: apiItem.frequencia || (apiItem.diasSemana === 'TODOS' ? '1x ao dia (Diário)' : apiItem.diasSemana) || 'Personalizado',
    tipoFormato: apiItem.tipoFormato,
    ativo: apiItem.ativo !== undefined ? Boolean(apiItem.ativo) : true,
    statusHoje: statusContrato,
    horarioIngestaoHoje: apiItem.horarioIngestaoHoje || null,
    isProximo: false,
  });
}

export interface OpcoesRede {
  cliente?: Pick<ApiClient, 'get' | 'post' | 'put' | 'delete'>;
}

/**
 * Busca as rotinas de medicamentos do idoso: GET /api/v1/idosos/{idosoId}/rotinas-medicamentos?apenasAtivos=true.
 * `apenasAtivos` vai sempre na query (o servidor só deve devolver rotinas ativas). Lista vazia do servidor fica
 * vazia. Sem rede, cai no cache SQLite, que só guarda o que veio do servidor (RF-038). Em 4xx/5xx lança.
 */
export async function listarRotinas(
  idosoId: string,
  { data, cliente = apiClient }: OpcoesRede & { data?: string } = {}
): Promise<RotinaMedicamento[]> {
  const query = new URLSearchParams({ apenasAtivos: 'true' });
  if (data) query.set('data', data);

  try {
    const resposta = await cliente.get<Array<Record<string, any>>>(
      `/api/v1/idosos/${idosoId}/rotinas-medicamentos?${query.toString()}`
    );
    const rotinas = (Array.isArray(resposta) ? resposta : []).map(normalizarRotinaApi);
    localMedicinesStore = rotinas;
    await salvarRotinasNoCache(idosoId, rotinas);
    agendarLembretesMedicacao(rotinas).catch(() => {});
    return rotinas;
  } catch (error: any) {
    if (!(error instanceof ApiError) || !error.erroDeRede) throw error;
    console.warn('[medicamentoService] Backend inacessível. Recorrendo à base local SQLite:', error?.message);
  }

  // Sem rede: recupera do SQLite local (offline-first / RF-038)
  try {
    const cached = await obterRotinasDoCache(idosoId);
    if (Array.isArray(cached) && cached.length > 0) {
      const rotinasCache = cached.map(enriquecerDadosVisuais);
      localMedicinesStore = rotinasCache;
      return rotinasCache;
    }
  } catch (cacheErr: any) {
    console.warn('[medicamentoService] Erro ao carregar cache SQLite:', cacheErr?.message);
  }

  // Dados de demonstração só com mock permitido (dev + EXPO_PUBLIC_USAR_MOCK)
  if (mockPermitido()) {
    await garantirRotinasIniciais();
    const fallback = localMedicinesStore.map(enriquecerDadosVisuais);
    salvarRotinasNoCache(idosoId, fallback).catch(() => {});
    agendarLembretesMedicacao(fallback).catch(() => {});
    return fallback;
  }

  throw new ApiError(0, null, `/api/v1/idosos/${idosoId}/rotinas-medicamentos`);
}

/**
 * Confirma a ingestão de um medicamento na rotina (HU-056 / HU-059 / RF-039).
 * POST /api/v1/rotinas-medicamentos/{rotinaId}/confirmar-ingestao (ConfirmarIngestaoRequest).
 * O estado local e o cache só mudam depois que o servidor confirma; em erro lança (sem sucesso inventado),
 * salvo com mock permitido, que registra só no aparelho.
 */
export async function confirmarIngestao(
  arg1: string,
  arg2: ConfirmacaoIngestaoInput | string | null = null,
  arg3: ConfirmacaoIngestaoInput | string | null = null,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<ConfirmacaoIngestaoResponse> {
  const agora = new Date();

  // Normalização de parâmetros flexíveis: (rotinaId, dados) ou (idosoId, rotinaId, dados)
  let rotinaId: string;
  let dadosConfirmacao: ConfirmacaoIngestaoInput = {};

  if (typeof arg2 === 'string' && arg2.length > 0) {
    rotinaId = arg2;
    dadosConfirmacao = typeof arg3 === 'string' ? { observacao: arg3 } : (arg3 || {});
  } else {
    rotinaId = arg1;
    dadosConfirmacao = typeof arg2 === 'string' ? { observacao: arg2 } : (arg2 || {});
  }

  const statusDesejado = dadosConfirmacao.status || 'TOMADO';
  const horaFormatada = statusDesejado === 'TOMADO'
    ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;
  const dataHoraIngestaoISO = statusDesejado === 'TOMADO' ? agora.toISOString() : null;

  const corpo: ConfirmarIngestaoRequest = {
    status: statusDesejado,
    observacao: dadosConfirmacao.observacao || (statusDesejado === 'TOMADO' ? 'Dose tomada conforme prescrito' : 'Dose desmarcada'),
  };
  if (dataHoraIngestaoISO) corpo.dataHoraIngestao = dataHoraIngestaoISO;

  const registrarLocalmente = async () => {
    atualizarStatusLocal(rotinaId, statusDesejado, horaFormatada);
    await atualizarStatusDoseCache(rotinaId, statusDesejado, horaFormatada);
  };

  try {
    const data = await cliente.post<Record<string, any>>(
      `/api/v1/rotinas-medicamentos/${rotinaId}/confirmar-ingestao`,
      corpo
    );
    await registrarLocalmente();
    return {
      rotinaId,
      status: data?.status || statusDesejado,
      dataHoraIngestao: data?.dataHoraIngestao || dataHoraIngestaoISO,
      horarioIngestaoHoje: horaFormatada,
      observacao: corpo.observacao || '',
      sucesso: true,
    };
  } catch (error: any) {
    if (!mockPermitido()) throw error;
    console.warn('[medicamentoService] Backend inacessível. Operação salva localmente (mock):', error?.message);
  }

  await registrarLocalmente();
  return {
    rotinaId,
    status: statusDesejado,
    dataHoraIngestao: dataHoraIngestaoISO,
    horarioIngestaoHoje: horaFormatada,
    observacao: corpo.observacao || '',
    sucesso: true,
  };
}

/** Só os campos do contrato, e só os que vieram preenchidos. */
function omitirVazios<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<T>;
}

/**
 * Cria uma nova rotina de medicamento (HU-056).
 * POST /api/v1/idosos/{idosoId}/rotinas-medicamentos com RotinaMedicamentoRequest (nomeMedicamento, dosagem,
 * instrucoes, horario, frequencia, diasSemana, dataInicio, dataFim, observacoes). O tipo de formato
 * (comprimido, gotas...) é só visual e não vai na requisição. 4xx lança; a rotina só entra no cache com o id do servidor.
 */
export async function criarRotina(
  idosoId: string,
  dadosRotina: Partial<RotinaMedicamento> & Record<string, any>,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<RotinaMedicamento> {
  const nomeMed = (dadosRotina.nomeMedicamento || dadosRotina.medicamentoNome || '').trim();
  const corpo = {
    ...omitirVazios({
      medicamentoId: dadosRotina.medicamentoId,
      nomeMedicamento: dadosRotina.medicamentoId ? undefined : nomeMed,
      dosagem: dadosRotina.dosagem,
      instrucoes: dadosRotina.instrucoes,
      diasSemana: dadosRotina.diasSemana,
      dataInicio: dadosRotina.dataInicio,
      dataFim: dadosRotina.dataFim,
      observacoes: dadosRotina.observacoes,
    }),
    horario: dadosRotina.horario as string,
    frequencia: (dadosRotina.frequencia || '') as string,
  } satisfies RotinaMedicamentoRequest;

  try {
    const novaRotina = await cliente.post<Record<string, any>>(
      `/api/v1/idosos/${idosoId}/rotinas-medicamentos`,
      corpo
    );
    const enriquecida = normalizarRotinaApi({
      ...novaRotina,
      medicamentoNome: novaRotina.medicamentoNome || nomeMed,
      tipoFormato: dadosRotina.tipoFormato,
    });

    localMedicinesStore = localMedicinesStore.filter((r) => r.id !== enriquecida.id);
    localMedicinesStore.push(enriquecida);
    localMedicinesStore.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

    await salvarRotinasNoCache(idosoId, localMedicinesStore);
    agendarLembretesMedicacao(localMedicinesStore).catch(() => {});
    return enriquecida;
  } catch (error: any) {
    if (!mockPermitido()) throw error;
    console.warn('[medicamentoService] Backend inacessível. Criando rotina só no aparelho (mock):', error?.message);
  }

  // Somente com mock permitido (dev): rotina local de demonstração
  const novaRotinaLocal = enriquecerDadosVisuais({
    id: `med-local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    idosoId,
    medicamentoNome: nomeMed,
    nomeMedicamento: nomeMed,
    dosagem: dadosRotina.dosagem || '',
    instrucoes: dadosRotina.instrucoes || '',
    horario: dadosRotina.horario || '08:00',
    frequencia: dadosRotina.frequencia || '1x ao dia (Diário)',
    diasSemana: dadosRotina.diasSemana || 'TODOS',
    tipoFormato: dadosRotina.tipoFormato || 'comprimido',
    observacoes: dadosRotina.observacoes || '',
    ativo: true,
    statusHoje: 'PENDENTE',
    horarioIngestaoHoje: null,
    isProximo: false,
  });

  localMedicinesStore = localMedicinesStore.filter((r) => r.id !== novaRotinaLocal.id);
  localMedicinesStore.push(novaRotinaLocal);
  localMedicinesStore.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  await salvarRotinasNoCache(idosoId, localMedicinesStore);
  agendarLembretesMedicacao(localMedicinesStore).catch(() => {});
  return novaRotinaLocal;
}

/**
 * Atualiza os dados de uma rotina de medicamento existente (HU-056 / RN-004).
 * PUT /api/v1/rotinas-medicamentos/{rotinaId} com AtualizarRotinaRequest: só horario, frequencia, diasSemana,
 * dataInicio, dataFim, ativo, observacoes, dosagem e instrucoes, e só os que foram enviados. O contrato não
 * permite trocar o nome do medicamento.
 */
export async function atualizarRotina(
  rotinaId: string,
  dadosAtualizacao: Partial<RotinaMedicamento> & Record<string, any>,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<RotinaMedicamento> {
  const nomeMed = (dadosAtualizacao.nomeMedicamento || dadosAtualizacao.medicamentoNome || '').trim();
  const dadosNormalizados = {
    ...dadosAtualizacao,
    ...(nomeMed ? { nomeMedicamento: nomeMed, medicamentoNome: nomeMed } : {}),
  };

  const campos: Array<keyof AtualizarRotinaRequest> = [
    'horario', 'frequencia', 'diasSemana', 'dataInicio', 'dataFim', 'ativo', 'observacoes', 'dosagem', 'instrucoes',
  ];
  const corpo: Record<string, unknown> = {};
  for (const campo of campos) {
    if (dadosAtualizacao[campo] !== undefined) corpo[campo] = dadosAtualizacao[campo];
  }

  try {
    const atualizada = await cliente.put<Record<string, any>>(`/api/v1/rotinas-medicamentos/${rotinaId}`, corpo satisfies AtualizarRotinaRequest);
    const doServidor = normalizarRotinaApi(atualizada);
    atualizarStoreLocal(rotinaId, doServidor);
    const enriquecida = localMedicinesStore.find((r) => r.id === rotinaId) ?? doServidor;
    if (enriquecida.idosoId) {
      salvarRotinasNoCache(enriquecida.idosoId, localMedicinesStore).catch(() => {});
    }
    agendarLembretesMedicacao(localMedicinesStore).catch(() => {});
    return enriquecida;
  } catch (error: any) {
    if (!mockPermitido()) throw error;
    console.warn('[medicamentoService] Backend inacessível. Atualizando rotina só no aparelho (mock):', error?.message);
  }

  // Somente com mock permitido (dev)
  atualizarStoreLocal(rotinaId, dadosNormalizados);
  const itemAtualizado = localMedicinesStore.find((r) => r.id === rotinaId);
  const enriquecida = enriquecerDadosVisuais(itemAtualizado || dadosNormalizados);

  if (enriquecida.idosoId) {
    salvarRotinasNoCache(enriquecida.idosoId, localMedicinesStore).catch(() => {});
  }
  agendarLembretesMedicacao(localMedicinesStore).catch(() => {});
  return enriquecida;
}

/**
 * Remove uma rotina de medicamento (HU-056). DELETE /api/v1/rotinas-medicamentos/{rotinaId} (204).
 * Só some do cache depois que o servidor confirma.
 */
export async function removerRotina(
  rotinaId: string,
  { cliente = apiClient }: OpcoesRede = {}
): Promise<boolean> {
  try {
    await cliente.delete(`/api/v1/rotinas-medicamentos/${rotinaId}`);
  } catch (error: any) {
    if (!mockPermitido()) throw error;
    console.warn('[medicamentoService] Backend inacessível. Removendo rotina só do aparelho (mock):', error?.message);
  }

  localMedicinesStore = localMedicinesStore.filter((r) => r.id !== rotinaId);
  await removerRotinaCache(rotinaId);
  agendarLembretesMedicacao(localMedicinesStore).catch(() => {});
  return true;
}

/**
 * Auxiliar para atualizar o status e horário de ingestão no cache local
 */
function atualizarStatusLocal(rotinaId: string, status: string, horarioIngestao: string | null): void {
  localMedicinesStore = localMedicinesStore.map((item) => {
    if (item.id === rotinaId) {
      const atualizado = {
        ...item,
        statusHoje: status,
        horarioIngestaoHoje: horarioIngestao,
        isProximo: false,
      };
      return enriquecerDadosVisuais(atualizado);
    }
    return item;
  });
}

/**
 * Auxiliar para atualizar atributos de um item existente no store local
 */
function atualizarStoreLocal(
  rotinaId: string,
  novosDados: Partial<RotinaMedicamento> & Record<string, any>
): void {
  const nomeMed = novosDados.nomeMedicamento || novosDados.medicamentoNome;
  localMedicinesStore = localMedicinesStore.map((item) => {
    if (item.id === rotinaId) {
      return {
        ...item,
        ...novosDados,
        medicamentoNome: nomeMed || item.medicamentoNome,
        nomeMedicamento: nomeMed || item.nomeMedicamento,
      };
    }
    return item;
  });
  localMedicinesStore.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
}

// Aliases para compatibilidade
export const cadastrarRotinaMedicamento = criarRotina;
export const salvarRotinaMedicamento = criarRotina;
export const atualizarRotinaMedicamento = atualizarRotina;
export const excluirRotinaMedicamento = removerRotina;
