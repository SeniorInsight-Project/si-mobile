import { mockPermitido } from '../config/ambiente';
import type { components } from '../types/contracts/care-v1';
import { apiClient, ApiError, type ApiClient } from './apiClient';
import { extrairMensagemErro } from './erroHelper';
import {
  salvarContatosNoCache,
  obterContatosDoCache,
  limparContatosDoCache,
} from './contatoEmergenciaDatabase';

export const LIMITE_CONTATOS_EMERGENCIA = 3;

type ContatoEmergenciaApi = components['schemas']['ContatoEmergencia'];
type ContatoEmergenciaRequestApi = components['schemas']['ContatoEmergenciaRequest'];

export interface OpcoesContatos {
  cliente?: Pick<ApiClient, 'get' | 'post' | 'put' | 'delete'>;
}

export function rotaContatosEmergencia(idosoId: string): string {
  return `/api/v1/idosos/${idosoId}/contatos-emergencia`;
}

function mapearContatoDoContrato(api: ContatoEmergenciaApi, fallbackOrdem = 1): ContatoEmergencia {
  return {
    id: api.id,
    nome: api.nome,
    parentesco: api.grauParentesco ?? 'Familiar',
    telefone: api.telefone,
    ordem: api.prioridade ?? fallbackOrdem,
    whatsapp: true,
    iniciais: gerarIniciais(api.nome),
    corAvatar: '#EEF2FF',
    corTexto: '#4338CA',
    ativo: true,
  };
}

function mapearContatoParaContrato(contato: NovoContatoEmergenciaInput, ordem: number): ContatoEmergenciaRequestApi {
  return {
    nome: contato.nome,
    telefone: contato.telefone,
    grauParentesco: contato.parentesco ?? null,
    prioridade: contato.ordem ?? ordem,
  };
}

function tratarErroContatos(erro: unknown, acao: string): Error {
  if (erro instanceof ApiError && (erro.status === 404 || erro.status === 501)) {
    return new Error('Contatos de emergência ainda não disponíveis.');
  }
  return new Error(extrairMensagemErro(erro, `Não foi possível ${acao} os contatos de emergência.`));
}

export interface ContatoEmergencia {
  id: string;
  nome: string;
  parentesco: string;
  telefone: string;
  ordem: number;
  whatsapp: boolean;
  iniciais: string;
  corAvatar: string;
  corTexto: string;
  ativo: boolean;
}

export interface NovoContatoEmergenciaInput {
  id?: string;
  nome: string;
  parentesco?: string;
  telefone: string;
  ordem?: number;
  whatsapp?: boolean;
  iniciais?: string;
  corAvatar?: string;
  corTexto?: string;
  ativo?: boolean;
}

let contatosEmMemoria: ContatoEmergencia[] = [];
let inicializado = false;

/**
 * Validação de telefone brasileiro (HU-011 Cenário 2).
 * Formato com DDD válido (11 a 99) e 10 a 11 dígitos.
 */
export function validarTelefone(telefone: string): { valido: boolean; mensagem?: string } {
  if (!telefone || typeof telefone !== 'string') {
    return { valido: false, mensagem: 'Telefone inválido' };
  }

  const digitos = telefone.replace(/\D/g, '');
  if (digitos.length < 10 || digitos.length > 11) {
    return { valido: false, mensagem: 'Telefone inválido' };
  }

  const ddd = parseInt(digitos.slice(0, 2), 10);
  if (isNaN(ddd) || ddd < 11 || ddd > 99) {
    return { valido: false, mensagem: 'Telefone inválido' };
  }

  // Celular (11 dígitos) no Brasil sempre começa com 9 após o DDD
  if (digitos.length === 11 && digitos[2] !== '9') {
    return { valido: false, mensagem: 'Telefone inválido' };
  }

  return { valido: true };
}

async function garantirContatos(idosoId?: string): Promise<void> {
  if (inicializado) return;

  if (idosoId) {
    const doCache = await obterContatosDoCache(idosoId);
    if (Array.isArray(doCache) && doCache.length > 0) {
      contatosEmMemoria = [...doCache];
      inicializado = true;
      return;
    }
  }

  inicializado = true;
  if (mockPermitido()) {
    const { CONTATOS_EMERGENCIA_PADRAO } = await import('../mocks/contatosEmergencia');
    contatosEmMemoria = [...(CONTATOS_EMERGENCIA_PADRAO as ContatoEmergencia[])];
    if (idosoId) {
      await salvarContatosNoCache(idosoId, contatosEmMemoria);
    }
  }
}

/**
 * Lista todos os contatos de emergência do idoso, ordenados por prioridade de acionamento.
 */
export async function listarContatos(
  idosoId?: string,
  opcoes: OpcoesContatos = {}
): Promise<ContatoEmergencia[]> {
  if (!mockPermitido()) {
    if (!idosoId) {
      throw new Error('Selecione um idoso para consultar os contatos de emergência.');
    }
    const cliente = opcoes.cliente ?? apiClient;
    try {
      const resposta = await cliente.get<ContatoEmergenciaApi[]>(rotaContatosEmergencia(idosoId));
      const lista = (Array.isArray(resposta) ? resposta : [])
        .map((item, idx) => mapearContatoDoContrato(item, idx + 1))
        .sort((a, b) => a.ordem - b.ordem);
      contatosEmMemoria = [...lista];
      inicializado = true;
      await salvarContatosNoCache(idosoId, contatosEmMemoria);
      return [...contatosEmMemoria];
    } catch (erro) {
      const doCache = await obterContatosDoCache(idosoId);
      if (Array.isArray(doCache) && doCache.length > 0) {
        contatosEmMemoria = [...doCache].sort((a, b) => a.ordem - b.ordem);
        inicializado = true;
        return [...contatosEmMemoria];
      }
      throw tratarErroContatos(erro, 'carregar');
    }
  }

  await garantirContatos(idosoId);
  return [...contatosEmMemoria].sort((a, b) => a.ordem - b.ordem);
}

/**
 * Adiciona ou atualiza um contato de emergência (respeitando validação de telefone e limite configurável).
 */
export async function salvarContato(
  idosoId: string,
  contato: NovoContatoEmergenciaInput,
  limiteMaximo?: number,
  opcoes: OpcoesContatos = {}
): Promise<ContatoEmergencia> {
  // Validação de telefone (HU-011 Cenário 2)
  const validacao = validarTelefone(contato.telefone);
  if (!validacao.valido) {
    throw new Error(validacao.mensagem || 'Telefone inválido');
  }

  if (!mockPermitido()) {
    if (!contato.id && limiteMaximo !== undefined && contatosEmMemoria.length >= limiteMaximo) {
      throw new Error(`Limite de ${limiteMaximo} contatos de emergência atingido`);
    }
    const cliente = opcoes.cliente ?? apiClient;
    try {
      const payload = mapearContatoParaContrato(contato, contatosEmMemoria.length + 1);
      const salvoApi = contato.id
        ? await cliente.put<ContatoEmergenciaApi>(`${rotaContatosEmergencia(idosoId)}/${contato.id}`, payload)
        : await cliente.post<ContatoEmergenciaApi>(rotaContatosEmergencia(idosoId), payload);
      const salvo = mapearContatoDoContrato(salvoApi, payload.prioridade ?? 1);
      const idx = contatosEmMemoria.findIndex((c) => c.id === salvo.id);
      if (idx !== -1) {
        contatosEmMemoria[idx] = salvo;
      } else {
        contatosEmMemoria.push(salvo);
      }
      await salvarContatosNoCache(idosoId, contatosEmMemoria);
      return salvo;
    } catch (erro) {
      throw tratarErroContatos(erro, 'salvar');
    }
  }

  await garantirContatos(idosoId);

  if (contato.id) {
    const idx = contatosEmMemoria.findIndex((c) => c.id === contato.id);
    if (idx !== -1) {
      contatosEmMemoria[idx] = { ...contatosEmMemoria[idx], ...contato };
      await salvarContatosNoCache(idosoId, contatosEmMemoria);
      return contatosEmMemoria[idx];
    }
  }

  // Limite de contatos de emergência (HU-011 / RN-002)
  if (limiteMaximo !== undefined && contatosEmMemoria.length >= limiteMaximo) {
    throw new Error(`Limite de ${limiteMaximo} contatos de emergência atingido`);
  }

  const novoContato: ContatoEmergencia = {
    id: `contato-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    parentesco: contato.parentesco || 'Familiar',
    ordem: contato.ordem || contatosEmMemoria.length + 1,
    whatsapp: contato.whatsapp ?? true,
    iniciais: contato.iniciais || gerarIniciais(contato.nome),
    corAvatar: contato.corAvatar || '#EEF2FF',
    corTexto: contato.corTexto || '#4338CA',
    ativo: true,
    ...contato,
  };

  contatosEmMemoria.push(novoContato);
  await salvarContatosNoCache(idosoId, contatosEmMemoria);
  return novoContato;
}

/**
 * Remove um contato de emergência pelo ID.
 */
export async function removerContato(
  idosoId: string,
  contatoId: string,
  opcoes: OpcoesContatos = {}
): Promise<boolean> {
  if (!mockPermitido()) {
    const cliente = opcoes.cliente ?? apiClient;
    try {
      await cliente.delete(`${rotaContatosEmergencia(idosoId)}/${contatoId}`);
      const totalAntes = contatosEmMemoria.length;
      contatosEmMemoria = contatosEmMemoria.filter((c) => c.id !== contatoId);
      contatosEmMemoria.forEach((c, idx) => {
        c.ordem = idx + 1;
      });
      await salvarContatosNoCache(idosoId, contatosEmMemoria);
      return contatosEmMemoria.length < totalAntes;
    } catch (erro) {
      throw tratarErroContatos(erro, 'remover');
    }
  }

  await garantirContatos(idosoId);
  const totalAntes = contatosEmMemoria.length;
  contatosEmMemoria = contatosEmMemoria.filter((c) => c.id !== contatoId);

  // Reordena as prioridades após remoção
  contatosEmMemoria.forEach((c, idx) => {
    c.ordem = idx + 1;
  });

  await salvarContatosNoCache(idosoId, contatosEmMemoria);
  return contatosEmMemoria.length < totalAntes;
}

/**
 * Atualiza a ordem de prioridade de todos os contatos de emergência (Reorder / Drag & Drop).
 */
export async function reordenarContatos(
  idosoId: string,
  novaListaContatos: ContatoEmergencia[],
  opcoes: OpcoesContatos = {}
): Promise<ContatoEmergencia[]> {
  if (!mockPermitido()) {
    const cliente = opcoes.cliente ?? apiClient;
    try {
      const atualizados: ContatoEmergencia[] = [];
      for (let idx = 0; idx < novaListaContatos.length; idx++) {
        const c = novaListaContatos[idx];
        const ordem = idx + 1;
        const payload = mapearContatoParaContrato({ ...c, ordem }, ordem);
        await cliente.put(`${rotaContatosEmergencia(idosoId)}/${c.id}`, payload);
        atualizados.push({ ...c, ordem });
      }
      contatosEmMemoria = [...atualizados];
      await salvarContatosNoCache(idosoId, contatosEmMemoria);
      return [...contatosEmMemoria];
    } catch (erro) {
      throw tratarErroContatos(erro, 'reordenar');
    }
  }

  await garantirContatos(idosoId);
  const atualizados = novaListaContatos.map((c, idx) => ({
    ...c,
    ordem: idx + 1,
  }));
  contatosEmMemoria = [...atualizados];
  await salvarContatosNoCache(idosoId, contatosEmMemoria);
  return [...contatosEmMemoria];
}

/**
 * Restaura os contatos padrão iniciais (útil para testes).
 */
export function resetarContatos(): void {
  inicializado = false;
  contatosEmMemoria = [];
  limparContatosDoCache().catch((err) => {
    console.warn('[contatoEmergencia] Erro ao limpar cache no reset:', err instanceof Error ? err.message : 'erro desconhecido');
  });
}

/** Exclusão da conta (HU-022): esquece os contatos em memória. O SQLite é apagado à parte. */
export function descartarContatosEmMemoria(): void {
  inicializado = false;
  contatosEmMemoria = [];
}

export function __definirContatosParaTestes(contatos: ContatoEmergencia[]): void {
  inicializado = true;
  contatosEmMemoria = [...contatos];
}

function gerarIniciais(nome = ''): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 0 || !partes[0]) return 'CO';
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
