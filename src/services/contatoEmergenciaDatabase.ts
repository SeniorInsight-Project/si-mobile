import type { ContatoEmergencia } from './contatoEmergenciaService';
import { extrairMensagemErro } from './erroHelper';

let contatosCache: ContatoEmergencia[] = [];
let simularFalha = false;

export function __simularFalhaBanco(deveFalhar: boolean): void {
  simularFalha = deveFalhar;
}

export async function getContatosDatabase(): Promise<null> {
  if (simularFalha) {
    throw new Error('Falha simulada no SQLite');
  }
  return null;
}

export async function salvarContatosNoCache(
  idosoId: string,
  contatos: ContatoEmergencia[]
): Promise<ContatoEmergencia[]> {
  if (simularFalha) {
    console.warn('[contatoEmergencia] falha no SQLite: Erro ao persistir dados');
    throw new Error(extrairMensagemErro(new Error('Erro ao persistir dados no SQLite')));
  }
  if (!Array.isArray(contatos)) return [];
  contatosCache = [...contatos];
  return [...contatosCache];
}

export async function obterContatosDoCache(idosoId: string): Promise<ContatoEmergencia[]> {
  if (simularFalha) {
    console.warn('[contatoEmergencia] falha no SQLite: Erro ao consultar dados');
    throw new Error(extrairMensagemErro(new Error('Erro ao consultar dados no SQLite')));
  }
  return [...contatosCache].sort((a, b) => a.ordem - b.ordem);
}

export async function limparContatosDoCache(idosoId?: string): Promise<void> {
  if (simularFalha) {
    console.warn('[contatoEmergencia] falha no SQLite: Erro ao limpar dados');
    throw new Error(extrairMensagemErro(new Error('Erro ao limpar dados no SQLite')));
  }
  contatosCache = [];
}
