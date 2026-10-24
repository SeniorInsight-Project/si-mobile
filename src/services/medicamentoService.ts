import { runtimeConfig } from '../config/runtime';

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
  dataHoraIngestao: string;
  observacao: string;
  sucesso?: boolean;
  [key: string]: any;
}

/**
 * Lista inicial padrão de rotinas de medicamentos baseada no template visual do Figma (HU26).
 * Fornece fallback resiliente em ambiente de desenvolvimento ou offline.
 */
export const INITIAL_MEDICINES: RotinaMedicamento[] = [
  {
    id: 'med-rotina-001',
    idosoId: 'e3b0c442-98fc-1c14-9afc-432100000001',
    idosoNome: 'Dona Maria Aparecida',
    medicamentoId: 'med-db-001',
    medicamentoNome: 'Losartana 50mg',
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
  const nomeLower = (rotina.medicamentoNome || '').toLowerCase();
  const dosagemLower = (rotina.dosagem || '').toLowerCase();
  const instrucoesLower = (rotina.instrucoes || '').toLowerCase();

  let thumbEmoji = '💊';
  let corFundoThumb = '#EBF3FE';
  let tipoFormato = 'comprimido';

  if (nomeLower.includes('xarope') || dosagemLower.includes('ml') || dosagemLower.includes('copo')) {
    thumbEmoji = '🧴';
    corFundoThumb = '#FEF3EC';
    tipoFormato = 'xarope';
  } else if (nomeLower.includes('colírio') || nomeLower.includes('colirio') || dosagemLower.includes('gota') || instrucoesLower.includes('olho')) {
    thumbEmoji = '💧';
    corFundoThumb = '#F4EEFD';
    tipoFormato = 'colirio';
  } else if (nomeLower.includes('insulina') || nomeLower.includes('inje') || dosagemLower.includes('ui')) {
    thumbEmoji = '💉';
    corFundoThumb = '#FEE2E2';
    tipoFormato = 'injecao';
  } else if (nomeLower.includes('enalapril') || nomeLower.includes('verde')) {
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
    medicamentoNome: rotina.medicamentoNome || rotina.nomeMedicamento || '',
    dosagem: rotina.dosagem || '',
    instrucoes: rotina.instrucoes || '',
    horario: rotina.horario || '08:00',
    frequencia: rotina.frequencia || '1x ao dia (Diário)',
    ativo: rotina.ativo ?? true,
    statusHoje: rotina.statusHoje || 'PENDENTE',
    horarioIngestaoHoje: rotina.horarioIngestaoHoje ?? null,
    isProximo: rotina.isProximo ?? false,
    ...rotina,
    thumbEmoji: rotina.thumbEmoji || thumbEmoji,
    corFundoThumb: rotina.corFundoThumb || corFundoThumb,
    tipoFormato: rotina.tipoFormato || tipoFormato,
    iconeTipo,
    corIcone,
  };
}

/**
 * Lista as rotinas diárias de medicamentos do idoso (HU26).
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
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/rotinas-medicamentos${queryString}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.warn(`[medicamentoService] Falha ao listar rotinas (${response.status}). Retornando dados locais.`);
      return localMedicinesStore.map(enriquecerDadosVisuais);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map(enriquecerDadosVisuais);
    }

    return localMedicinesStore.map(enriquecerDadosVisuais);
  } catch (error: any) {
    console.warn('[medicamentoService] Backend inacessível. Usando fallback de rotinas:', error?.message);
    return localMedicinesStore.map(enriquecerDadosVisuais);
  }
}

/**
 * Confirma a ingestão de um medicamento na rotina (HU26).
 * Endpoint: POST /api/v1/rotinas-medicamentos/{rotinaId}/confirmar-ingestao
 */
export async function confirmarIngestao(
  rotinaId: string,
  dadosConfirmacao: ConfirmacaoIngestaoInput | string = {},
  token: string | null = null
): Promise<ConfirmacaoIngestaoResponse> {
  const agora = new Date();
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const confirmacaoObj: ConfirmacaoIngestaoInput =
    typeof dadosConfirmacao === 'object' && dadosConfirmacao !== null ? dadosConfirmacao : {};

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const bodyPayload = {
      dataHoraIngestao: confirmacaoObj.dataHoraIngestao || agora.toISOString(),
      dataReferencia: confirmacaoObj.dataReferencia || agora.toISOString().split('T')[0],
      observacao: confirmacaoObj.observacao || 'Confirmado via aplicativo SeniorInsight',
      status: confirmacaoObj.status || 'TOMADO',
    };

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/rotinas-medicamentos/${rotinaId}/confirmar-ingestao`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      console.warn(`[medicamentoService] Status ${response.status} na API ao confirmar ingestão. Atualizando store local.`);
    } else {
      const data = await response.json();
      atualizarStatusLocal(rotinaId, 'TOMADO', horaFormatada);
      return data;
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Erro de rede ao confirmar ingestão. Registrando localmente:', error?.message);
  }

  // Fallback / Atualização otimista no store local
  atualizarStatusLocal(rotinaId, 'TOMADO', horaFormatada);
  return {
    rotinaId,
    status: 'TOMADO',
    dataHoraIngestao: agora.toISOString(),
    observacao: confirmacaoObj.observacao || 'Confirmado com sucesso',
  };
}

/**
 * Cria uma nova rotina de medicamento para o idoso (HU26).
 * Endpoint: POST /api/v1/idosos/{idosoId}/rotinas-medicamentos
 */
export async function criarRotina(
  idosoId: string,
  dadosRotina: Partial<RotinaMedicamento> & Record<string, any>,
  token: string | null = null
): Promise<RotinaMedicamento> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/idosos/${idosoId}/rotinas-medicamentos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dadosRotina),
    });

    if (response.ok) {
      const novaRotina = await response.json();
      localMedicinesStore.push(enriquecerDadosVisuais(novaRotina));
      return enriquecerDadosVisuais(novaRotina);
    }
    console.warn(`[medicamentoService] Resposta ${response.status} ao criar rotina. Criando no store local.`);
  } catch (error: any) {
    console.warn('[medicamentoService] Falha de conexão ao criar rotina. Criando localmente:', error?.message);
  }

  // Fallback offline: adiciona à lista local com identificador gerado
  const novaRotinaLocal = enriquecerDadosVisuais({
    id: `med-local-${Date.now()}`,
    idosoId,
    medicamentoNome: dadosRotina.nomeMedicamento || dadosRotina.medicamentoNome || '',
    dosagem: dadosRotina.dosagem || '',
    instrucoes: dadosRotina.instrucoes || 'Conforme orientação médica',
    horario: dadosRotina.horario || '12:00',
    frequencia: dadosRotina.frequencia || '1x ao dia (Diário)',
    diasSemana: dadosRotina.diasSemana || 'TODOS',
    ativo: true,
    statusHoje: 'PENDENTE',
    horarioIngestaoHoje: null,
    isProximo: false,
  });

  localMedicinesStore.push(novaRotinaLocal);
  // Reordena cronologicamente
  localMedicinesStore.sort((a, b) => a.horario.localeCompare(b.horario));
  return novaRotinaLocal;
}

/**
 * Atualiza os dados de uma rotina de medicamento existente (HU26).
 * Endpoint: PUT /api/v1/rotinas-medicamentos/{rotinaId}
 */
export async function atualizarRotina(
  rotinaId: string,
  dadosAtualizacao: Partial<RotinaMedicamento> & Record<string, any>,
  token: string | null = null
): Promise<RotinaMedicamento> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/rotinas-medicamentos/${rotinaId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(dadosAtualizacao),
    });

    if (response.ok) {
      const atualizada = await response.json();
      atualizarStoreLocal(rotinaId, atualizada);
      return enriquecerDadosVisuais(atualizada);
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Falha de conexão ao atualizar rotina:', error?.message);
  }

  // Atualização no store local
  atualizarStoreLocal(rotinaId, dadosAtualizacao);
  const itemAtualizado = localMedicinesStore.find((r) => r.id === rotinaId);
  return enriquecerDadosVisuais(itemAtualizado || dadosAtualizacao);
}

/**
 * Remove uma rotina de medicamento (HU26).
 * Endpoint: DELETE /api/v1/rotinas-medicamentos/{rotinaId}
 */
export async function removerRotina(
  rotinaId: string,
  token: string | null = null
): Promise<boolean> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${runtimeConfig.apiBaseUrl}/api/v1/rotinas-medicamentos/${rotinaId}`, {
      method: 'DELETE',
      headers,
    });

    if (response.ok || response.status === 204) {
      localMedicinesStore = localMedicinesStore.filter((r) => r.id !== rotinaId);
      return true;
    }
  } catch (error: any) {
    console.warn('[medicamentoService] Erro ao remover rotina no backend:', error?.message);
  }

  localMedicinesStore = localMedicinesStore.filter((r) => r.id !== rotinaId);
  return true;
}

/**
 * Auxiliar para atualizar o status e horário de ingestão no cache local
 */
function atualizarStatusLocal(rotinaId: string, status: string, horarioIngestao: string): void {
  localMedicinesStore = localMedicinesStore.map((item) => {
    if (item.id === rotinaId) {
      return {
        ...item,
        statusHoje: status,
        horarioIngestaoHoje: horarioIngestao,
        isProximo: false,
        iconeTipo: status === 'TOMADO' ? 'check' : item.iconeTipo,
        corIcone: status === 'TOMADO' ? '#10B981' : item.corIcone,
      };
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
  localMedicinesStore = localMedicinesStore.map((item) => {
    if (item.id === rotinaId) {
      return {
        ...item,
        ...novosDados,
        medicamentoNome: novosDados.nomeMedicamento || novosDados.medicamentoNome || item.medicamentoNome,
      };
    }
    return item;
  });
  localMedicinesStore.sort((a, b) => a.horario.localeCompare(b.horario));
}
