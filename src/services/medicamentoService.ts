import { runtimeConfig } from '../config/runtime';
import { mockPermitido } from '../config/ambiente';
import type { ConfirmarIngestaoRequest } from '../types/api';
import { resolverTokenAutorizacao } from './tokenStorageService';
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
    medicamentoId: rotina.medicamentoId || `med-${Date.now()}`,
    medicamentoNome: nome,
    nomeMedicamento: nome,
    dosagem: rotina.dosagem || '1 comprimido',
    instrucoes: rotina.instrucoes || 'Tomar conforme orientação',
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
 * Normaliza objetos retornados pela API (formato contrato OpenAPI)
 */
export function normalizarRotinaApi(apiItem: Record<string, any>): RotinaMedicamento {
  const statusContrato = (apiItem.status || 'PENDENTE').toUpperCase();

  return enriquecerDadosVisuais({
    id: apiItem.id,
    idosoId: apiItem.idosoId,
    medicamentoId: apiItem.medicamentoId,
    medicamentoNome: apiItem.medicamentoNome,
    nomeMedicamento: apiItem.medicamentoNome,
    dosagem: apiItem.dosagem,
    instrucoes: apiItem.instrucoes,
    observacoes: apiItem.observacoes,
    horario: apiItem.horario,
    diasSemana: apiItem.diasSemana,
    frequencia: apiItem.diasSemana === 'TODOS' ? '1x ao dia (Diário)' : (apiItem.diasSemana || 'Personalizado'),
    tipoFormato: apiItem.tipoFormato || 'comprimido',
    ativo: apiItem.ativo !== undefined ? Boolean(apiItem.ativo) : true,
    statusHoje: statusContrato,
    horarioIngestaoHoje: apiItem.horarioIngestaoHoje || null,
    isProximo: false,
  });
}

/**
 * Busca todas as rotinas de medicamentos de um idoso.
 */
export async function listarRotinas(
  idosoId: string,
  token: string | null = null
): Promise<RotinaMedicamento[]> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(
      `${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/rotinas-medicamentos`,
      {
        method: 'GET',
        headers,
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const enriquecidos = data.map(enriquecerDadosVisuais);
        localMedicinesStore = enriquecidos;
        await salvarRotinasNoCache(idosoId, enriquecidos);
        agendarLembretesMedicacao(enriquecidos).catch(() => {});
        return enriquecidos;
      }
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Backend inacessível. Recorrendo à base local SQLite:', error?.message);
  }

  // Fallback 1: Recupera do SQLite local (Offline-first / RF-038)
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

  // Fallback 2: Dados em memória pré-carregados se mockPermitido
  if (mockPermitido()) {
    await garantirRotinasIniciais();
    const fallback = localMedicinesStore.map(enriquecerDadosVisuais);
    salvarRotinasNoCache(idosoId, fallback).catch(() => {});
    agendarLembretesMedicacao(fallback).catch(() => {});
    return fallback;
  }

  return [];
}

/**
 * Confirma a ingestão de um medicamento na rotina (HU-056 / HU-059 / RF-039).
 */
export async function confirmarIngestao(
  arg1: string,
  arg2: ConfirmacaoIngestaoInput | string | null = null,
  arg3: ConfirmacaoIngestaoInput | string | null = null,
  token: string | null = null
): Promise<ConfirmacaoIngestaoResponse> {
  const agora = new Date();

  // Normalização de parâmetros flexíveis
  let rotinaId: string;
  let dadosConfirmacao: ConfirmacaoIngestaoInput = {};

  if (typeof arg2 === 'string' && arg2.length > 0) {
    rotinaId = arg2;
    dadosConfirmacao = typeof arg3 === 'string' ? { observacao: arg3 } : (arg3 || {});
  } else {
    rotinaId = arg1;
    dadosConfirmacao = typeof arg2 === 'string' ? { observacao: arg2 } : (arg2 || {});
    if (typeof arg3 === 'string') token = arg3;
  }

  const statusDesejado = dadosConfirmacao.status || 'TOMADO';
  const horaFormatada = statusDesejado === 'TOMADO'
    ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;
  const dataHoraIngestaoISO = statusDesejado === 'TOMADO' ? agora.toISOString() : null;

  // Atualiza estado em memória e banco SQLite
  atualizarStatusLocal(rotinaId, statusDesejado, horaFormatada);
  await atualizarStatusDoseCache(rotinaId, statusDesejado, horaFormatada);

  const payloadGateway: ConfirmarIngestaoRequest = {
    horarioIngestao: dataHoraIngestaoISO || '',
    observacao: dadosConfirmacao.observacao || (statusDesejado === 'TOMADO' ? 'Dose tomada conforme prescrito' : 'Dose desmarcada'),
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(
      `${runtimeConfig.apiBaseUrl}/api/v1/rotinas-medicamentos/${rotinaId}/confirmacoes`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadGateway),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        rotinaId,
        status: data.status || statusDesejado,
        dataHoraIngestao: data.horarioIngestao || dataHoraIngestaoISO,
        horarioIngestaoHoje: horaFormatada,
        observacao: payloadGateway.observacao || '',
        sucesso: true,
      };
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Backend inacessível. Operação salva localmente:', error?.message);
  }

  return {
    rotinaId,
    status: statusDesejado,
    dataHoraIngestao: dataHoraIngestaoISO,
    horarioIngestaoHoje: horaFormatada,
    observacao: payloadGateway.observacao || '',
    sucesso: true,
  };
}

/**
 * Cria uma nova rotina de medicamento (HU-056).
 */
export async function criarRotina(
  idosoId: string,
  dadosRotina: Partial<RotinaMedicamento> & Record<string, any>,
  token: string | null = null
): Promise<RotinaMedicamento> {
  const nomeMed = (dadosRotina.nomeMedicamento || dadosRotina.medicamentoNome || '').trim();
  const payloadGateway = {
    medicamentoNome: nomeMed,
    dosagem: dadosRotina.dosagem,
    horario: dadosRotina.horario,
    diasSemana: dadosRotina.diasSemana || 'TODOS',
    tipoFormato: dadosRotina.tipoFormato || 'comprimido',
    instrucoes: dadosRotina.instrucoes || '',
    observacoes: dadosRotina.observacoes || '',
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(
      `${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/rotinas-medicamentos`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadGateway),
      }
    );

    if (response.ok) {
      const novaRotina = await response.json();
      const enriquecida = enriquecerDadosVisuais({
        ...novaRotina,
        medicamentoNome: novaRotina.medicamentoNome || nomeMed,
        nomeMedicamento: novaRotina.medicamentoNome || nomeMed,
        tipoFormato: dadosRotina.tipoFormato || novaRotina.tipoFormato,
      });

      localMedicinesStore = localMedicinesStore.filter((r) => r.id !== enriquecida.id);
      localMedicinesStore.push(enriquecida);
      localMedicinesStore.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

      await salvarRotinasNoCache(idosoId, localMedicinesStore);
      agendarLembretesMedicacao(localMedicinesStore).catch(() => {});
      return enriquecida;
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Falha de conexão ao criar rotina. Criando no SQLite local:', error?.message);
  }

  // Fallback offline resiliente
  const novaRotinaLocal = enriquecerDadosVisuais({
    id: `med-local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    idosoId,
    medicamentoNome: nomeMed,
    nomeMedicamento: nomeMed,
    dosagem: dadosRotina.dosagem || '',
    instrucoes: dadosRotina.instrucoes || 'Conforme orientação médica',
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
 */
export async function atualizarRotina(
  rotinaId: string,
  dadosAtualizacao: Partial<RotinaMedicamento> & Record<string, any>,
  token: string | null = null
): Promise<RotinaMedicamento> {
  const nomeMed = (dadosAtualizacao.nomeMedicamento || dadosAtualizacao.medicamentoNome || '').trim();
  const dadosNormalizados = {
    ...dadosAtualizacao,
    ...(nomeMed ? { nomeMedicamento: nomeMed, medicamentoNome: nomeMed } : {}),
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(
      `${runtimeConfig.apiBaseUrl}/api/v1/rotinas-medicamentos/${rotinaId}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(dadosNormalizados),
      }
    );

    if (response.ok) {
      const atualizada = await response.json();
      atualizarStoreLocal(rotinaId, atualizada);
      const enriquecida = enriquecerDadosVisuais(atualizada);
      if (enriquecida.idosoId) {
        salvarRotinasNoCache(enriquecida.idosoId, localMedicinesStore).catch(() => {});
      }
      agendarLembretesMedicacao(localMedicinesStore).catch(() => {});
      return enriquecida;
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Falha ao atualizar rotina no backend:', error?.message);
  }

  // Atualização no store local e SQLite
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
 * Remove uma rotina de medicamento (HU-056).
 */
export async function removerRotina(
  rotinaId: string,
  token: string | null = null
): Promise<boolean> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const authToken = await resolverTokenAutorizacao(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(
      `${runtimeConfig.apiBaseUrl}/api/v1/rotinas-medicamentos/${rotinaId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (response.ok || response.status === 204) {
      localMedicinesStore = localMedicinesStore.filter((r) => r.id !== rotinaId);
      await removerRotinaCache(rotinaId);
      agendarLembretesMedicacao(localMedicinesStore).catch(() => {});
      return true;
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Erro ao remover rotina no backend:', error?.message);
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
