import type { ContatoEmergencia } from './contatoEmergenciaService';

/**
 * Fallback em memória para Web e testes Node.js.
 */
let contatosCache: ContatoEmergencia[] = [];

export async function getContatosDatabase(): Promise<null> {
  return null;
}

export async function salvarContatosNoCache(
  idosoId: string,
  contatos: ContatoEmergencia[]
): Promise<ContatoEmergencia[]> {
  if (!Array.isArray(contatos)) return [];
  contatosCache = [...contatos];
  return [...contatosCache];
}

export async function obterContatosDoCache(idosoId: string): Promise<ContatoEmergencia[]> {
  return [...contatosCache].sort((a, b) => a.ordem - b.ordem);
}

export async function limparContatosDoCache(idosoId?: string): Promise<void> {
  contatosCache = [];
}
