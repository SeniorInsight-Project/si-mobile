import { runtimeConfig } from '../config/runtime';
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

export interface ConfirmacaoIngestaoInput {
  dataHoraIngestao?: string;
  dataReferencia?: string;
  observacao?: string;
  status?: string;
}

export interface ConfirmacaoIngestaoResponse {
  rotinaId: string;
  status: string;
  dataHoraIngestao: string | null;
  observacao: string;
  horarioIngestaoHoje?: string | null;
  sucesso?: boolean;
  [key: string]: any;
}

/**
 * Lista inicial padrão de rotinas de medicamentos baseada no template visual do Figma (HU26 / HU-056).
 * Fornece fallback resiliente em ambiente de desenvolvimento ou offline.
 */
export const INITIAL_MEDICINES: RotinaMedicamento[] = [
  {
    id: 'med-rotina-001',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-001',
    medicamentoNome: 'Losartana 50mg',
    nomeMedicamento: 'Losartana 50mg',
    dosagem: '1 comprimido • Uso contínuo',
    instrucoes: 'Tomar com 1 copo de água',
    horario: '08:00',
    frequencia: '1x ao dia (Diário)',
    diasSemana: 'TODOS',
    tipoFormato: 'comprimido',
    ativo: true,
    statusHoje: 'TOMADO',
    horarioIngestaoHoje: '08:05',
    isProximo: false,
    iconeTipo: 'check',
    corIcone: '#10B981',
    corFundoThumb: '#E8F8F0',
    thumbEmoji: '💊',
  },
  {
    id: 'med-rotina-002',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-002',
    medicamentoNome: 'Vitamina D3',
    nomeMedicamento: 'Vitamina D3',
    dosagem: '2.000 UI • 1 cápsula gelatinosa',
    instrucoes: 'Junto ao café da manhã',
    horario: '10:00',
    frequencia: '1x ao dia (Diário)',
    diasSemana: 'TODOS',
    tipoFormato: 'comprimido',
    ativo: true,
    statusHoje: 'PENDENTE',
    horarioIngestaoHoje: null,
    isProximo: true,
    iconeTipo: 'clock',
    corIcone: '#F59E0B',
    corFundoThumb: '#EBF5FF',
    thumbEmoji: '💊',
  },
  {
    id: 'med-rotina-003',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-003',
    medicamentoNome: 'Metformina 850mg',
    nomeMedicamento: 'Metformina 850mg',
    dosagem: '1 comprimido • Controle glicêmico',
    instrucoes: 'Logo após o almoço',
    horario: '14:00',
    frequencia: '1x ao dia (Diário)',
    diasSemana: 'TODOS',
    tipoFormato: 'xarope',
    ativo: true,
    statusHoje: 'PENDENTE',
    horarioIngestaoHoje: null,
    isProximo: false,
    iconeTipo: 'sun',
    corIcone: '#9A3412',
    corFundoThumb: '#FFF1EC',
    thumbEmoji: '🧴',
  },
  {
    id: 'med-rotina-004',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-004',
    medicamentoNome: 'Sinvastatina 20mg',
    nomeMedicamento: 'Sinvastatina 20mg',
    dosagem: '1 comprimido • Uso noturno',
    instrucoes: 'Antes de dormir',
    horario: '20:00',
    frequencia: '1x ao dia (Diário)',
    diasSemana: 'TODOS',
    tipoFormato: 'gotas',
    ativo: true,
    statusHoje: 'PENDENTE',
    horarioIngestaoHoje: null,
    isProximo: false,
    iconeTipo: 'moon',
    corIcone: '#5B21B6',
    corFundoThumb: '#F3EEFF',
    thumbEmoji: '💧',
  },
];

// Estado local em memória para garantir consistência nas operações offline/mock
let localMedicinesStore: RotinaMedicamento[] = [...INITIAL_MEDICINES];

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

  // Determina o tipo de ícone da linha do tempo baseado no status ou horário
  let iconeTipo = 'clock';
  let corIcone = '#0284C7';

  if (rotina.statusHoje === 'TOMADO') {
    iconeTipo = 'check';
    corIcone = '#10B981';
  } else {
    const hora = parseInt((rotina.horario || '08:00').split(':')[0], 10);
    if (hora < 12) {
      iconeTipo = 'clock';
      corIcone = '#0284C7';
    } else if (hora < 18) {
      iconeTipo = 'sun';
      corIcone = '#F97316';
    } else {
      iconeTipo = 'moon';
      corIcone = '#8B5CF6';
    }
  }

  return {
    id: rotina.id || `med-local-${Date.now()}`,
    dosagem: rotina.dosagem || '',
    instrucoes: rotina.instrucoes || '',
    horario: rotina.horario || '08:00',
    frequencia: rotina.frequencia || '1x ao dia (Diário)',
    ativo: rotina.ativo ?? true,
    statusHoje: rotina.statusHoje || 'PENDENTE',
    horarioIngestaoHoje: rotina.horarioIngestaoHoje ?? null,
    isProximo: rotina.isProximo ?? false,
    ...rotina,
    medicamentoNome: nome,
    nomeMedicamento: nome,
    thumbEmoji: rotina.thumbEmoji || thumbEmoji,
    corFundoThumb: rotina.corFundoThumb || corFundoThumb,
    tipoFormato,
    iconeTipo,
    corIcone,
  };
}

/**
 * Lista as rotinas diárias de medicamentos do idoso (HU-056 / HU26 / RF-038).
 * Tenta buscar no Gateway (backend Spring Boot); caso indisponível, recorre ao SQLite local.
 * Endpoint: GET /api/v1/idosos/{idosoId}/rotinas-medicamentos?data=YYYY-MM-DD&apenasAtivos=false
 */
export async function listarRotinas(
  idosoId: string,
  dataReferencia: string | null = null,
  apenasAtivos = false,
  token: string | null = null
): Promise<RotinaMedicamento[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const params = new URLSearchParams();
    if (dataReferencia) params.append('data', dataReferencia);
    if (apenasAtivos) params.append('apenasAtivos', 'true');

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(
      `${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/rotinas-medicamentos${queryString}`,
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
        // Salva de forma transparente no cache SQLite local para funcionamento offline
        await salvarRotinasNoCache(idosoId, enriquecidos);
        // Agenda lembretes locais sem bloquear a interface
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

  // Fallback 2: Dados em memória pré-carregados
  const fallback = localMedicinesStore.map(enriquecerDadosVisuais);
  // Garante que o cache SQLite seja populado com os dados iniciais
  salvarRotinasNoCache(idosoId, fallback).catch(() => {});
  agendarLembretesMedicacao(fallback).catch(() => {});
  return fallback;
}

/**
 * Confirma a ingestão de um medicamento na rotina (HU-056 / HU-059 / RF-039).
 * Aceita as assinaturas:
 * 1) confirmarIngestao(idosoId, rotinaId, observacao)
 * 2) confirmarIngestao(rotinaId, dadosConfirmacao, token)
 *
 * Endpoint: POST /api/v1/rotinas-medicamentos/{rotinaId}/confirmar-ingestao
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
    // Assinatura: (idosoId, rotinaId, observacao ou objeto de dados)
    rotinaId = arg2;
    dadosConfirmacao = typeof arg3 === 'string' ? { observacao: arg3 } : (arg3 || {});
  } else {
    // Assinatura: (rotinaId, dadosConfirmacao, token)
    rotinaId = arg1;
    dadosConfirmacao = typeof arg2 === 'string' ? { observacao: arg2 } : (arg2 || {});
    if (typeof arg3 === 'string') token = arg3;
  }

  const statusDesejado = dadosConfirmacao.status || 'TOMADO';
  const horaFormatada = statusDesejado === 'TOMADO'
    ? agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  // 1. Atualização imediata no store local em memória
  atualizarStatusLocal(rotinaId, statusDesejado, horaFormatada);

  // 2. Atualização imediata no SQLite local (Offline-first)
  try {
    await atualizarStatusDoseCache(rotinaId, statusDesejado, horaFormatada);
  } catch (dbErr: any) {
    console.warn('[medicamentoService] Falha ao persistir status no SQLite:', dbErr?.message);
  }

  // 3. Envio ao Gateway Spring Boot
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const bodyPayload = {
      dataHoraIngestao: statusDesejado === 'TOMADO' ? (dadosConfirmacao.dataHoraIngestao || agora.toISOString()) : null,
      dataReferencia: dadosConfirmacao.dataReferencia || agora.toISOString().split('T')[0],
      observacao: dadosConfirmacao.observacao || (statusDesejado === 'TOMADO' ? 'Confirmado via aplicativo SeniorInsight' : 'Dose desmarcada'),
      status: statusDesejado,
    };

    const response = await fetch(
      `${runtimeConfig.apiBaseUrl}/api/v1/rotinas-medicamentos/${rotinaId}/confirmar-ingestao`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        sucesso: true,
        rotinaId,
        status: data.status || statusDesejado,
        horarioIngestaoHoje: horaFormatada,
        ...data,
      };
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Falha de conexão ao confirmar ingestão. Mantido no SQLite:', error?.message);
  }

  // Resposta resiliente com garantia de sucesso para atualizar o estado do React
  return {
    sucesso: true,
    rotinaId,
    status: statusDesejado,
    horarioIngestaoHoje: horaFormatada,
    dataHoraIngestao: statusDesejado === 'TOMADO' ? agora.toISOString() : null,
    observacao: dadosConfirmacao.observacao || 'Atualizado localmente com sucesso',
  };
}

/**
 * Cria uma nova rotina de medicamento para o idoso (HU-056 / RN-004).
 * Endpoint: POST /api/v1/idosos/{idosoId}/rotinas-medicamentos
 */
export async function criarRotina(
  idosoId: string,
  dadosRotina: Partial<RotinaMedicamento> & Record<string, any>,
  token: string | null = null
): Promise<RotinaMedicamento> {
  const nomeMed = (dadosRotina.nomeMedicamento || dadosRotina.medicamentoNome || '').trim();

  const payloadGateway = {
    nomeMedicamento: nomeMed,
    medicamentoNome: nomeMed,
    dosagem: dadosRotina.dosagem,
    instrucoes: dadosRotina.instrucoes || 'Tomar conforme prescrição',
    horario: dadosRotina.horario || '08:00',
    frequencia: dadosRotina.frequencia || '1x ao dia (Diário)',
    diasSemana: dadosRotina.diasSemana || 'TODOS',
    tipoFormato: dadosRotina.tipoFormato || 'comprimido',
    observacoes: dadosRotina.observacoes || '',
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

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
 * Endpoint: PUT /api/v1/rotinas-medicamentos/{rotinaId}
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
    if (token) headers['Authorization'] = `Bearer ${token}`;

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
 * Endpoint: DELETE /api/v1/rotinas-medicamentos/{rotinaId}
 */
export async function removerRotina(
  rotinaId: string,
  token: string | null = null
): Promise<boolean> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

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
