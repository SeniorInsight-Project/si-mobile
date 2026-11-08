import { mockPermitido } from '../config/ambiente';
import {
  salvarContatosNoCache,
  obterContatosDoCache,
  limparContatosDoCache,
} from './contatoEmergenciaDatabase';

export const LIMITE_CONTATOS_EMERGENCIA = 3;

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
export async function listarContatos(idosoId?: string): Promise<ContatoEmergencia[]> {
  await garantirContatos(idosoId);
  return [...contatosEmMemoria].sort((a, b) => a.ordem - b.ordem);
}

/**
 * Adiciona ou atualiza um contato de emergência (respeitando validação de telefone e limite configurável).
 */
export async function salvarContato(
  idosoId: string,
  contato: NovoContatoEmergenciaInput,
  limiteMaximo?: number
): Promise<ContatoEmergencia> {
  await garantirContatos(idosoId);

  // Validação de telefone (HU-011 Cenário 2)
  const validacao = validarTelefone(contato.telefone);
  if (!validacao.valido) {
    throw new Error(validacao.mensagem || 'Telefone inválido');
  }

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
export async function removerContato(idosoId: string, contatoId: string): Promise<boolean> {
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
  novaListaContatos: ContatoEmergencia[]
): Promise<ContatoEmergencia[]> {
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
  limparContatosDoCache().catch(() => {});
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
