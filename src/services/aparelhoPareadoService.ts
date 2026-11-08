/**
 * Marca de "este celular é do idoso e já foi pareado" (HU-007).
 *
 * Fica no `expo-secure-store`, ao lado dos tokens, e guarda só o necessário para abrir o app no Modo Idoso
 * e cumprimentar o idoso mesmo sem rede: id do perfil, idosoId (para rotas de consentimento/exclusão)
 * e nome devolvidos pelo resgate. O papel continua vindo do token (RN-011); esta marca não dá acesso a nada sozinha.
 *
 * É apagada quando a sessão termina (logout ou refresh recusado): sem sessão, o aparelho precisa de um
 * código novo.
 */
export const CHAVE_APARELHO_PAREADO = 'si_aparelho_pareado';

export interface AparelhoPareado {
  perfilId: string;
  nome: string;
  /** Epoch ms do pareamento. */
  pareadoEm: number;
  /** Id do idoso no care-service para rotas de consentimentos e exclusão */
  idosoId?: string | null;
}

export interface ArmazenamentoSeguro {
  getItemAsync(chave: string): Promise<string | null>;
  setItemAsync(chave: string, valor: string): Promise<void>;
  deleteItemAsync(chave: string): Promise<void>;
}

let armazenamento: ArmazenamentoSeguro | null = null;

/** Troca o armazenamento (testes). `null` volta ao `expo-secure-store`. */
export function definirArmazenamentoAparelhoPareado(adaptador: ArmazenamentoSeguro | null): void {
  armazenamento = adaptador;
}

async function obterArmazenamento(): Promise<ArmazenamentoSeguro | null> {
  if (armazenamento) return armazenamento;
  try {
    const mod: any = await import('expo-secure-store');
    const store = mod.default && mod.default.getItemAsync ? mod.default : mod;
    return typeof store?.getItemAsync === 'function' ? store : null;
  } catch {
    return null;
  }
}

/** Guarda que o aparelho foi pareado. Não lança: sem secure store, o app segue pelo papel do token. */
export async function marcarAparelhoPareado(dados: {
  perfilId: string;
  nome: string;
  idosoId?: string | null;
}): Promise<boolean> {
  const store = await obterArmazenamento();
  if (!store) return false;
  const registro: AparelhoPareado = {
    perfilId: dados.perfilId,
    nome: dados.nome,
    pareadoEm: Date.now(),
    idosoId: dados.idosoId ?? null,
  };
  try {
    await store.setItemAsync(CHAVE_APARELHO_PAREADO, JSON.stringify(registro));
    return true;
  } catch (err) {
    console.warn('[aparelhoPareado] Não foi possível guardar o pareamento:', (err as Error)?.message);
    return false;
  }
}

/** Devolve o pareamento guardado, ou null se não há (ou se o registro está corrompido). */
export async function obterAparelhoPareado(): Promise<AparelhoPareado | null> {
  const store = await obterArmazenamento();
  if (!store) return null;
  try {
    const bruto = await store.getItemAsync(CHAVE_APARELHO_PAREADO);
    if (!bruto) return null;
    const r = JSON.parse(bruto);
    if (typeof r?.perfilId !== 'string' || typeof r?.nome !== 'string') return null;
    return {
      perfilId: r.perfilId,
      nome: r.nome,
      pareadoEm: typeof r.pareadoEm === 'number' ? r.pareadoEm : 0,
      idosoId: r.idosoId ?? null,
    };
  } catch {
    return null;
  }
}

/** Devolve apenas o idosoId guardado no pareamento, ou null. */
export async function obterIdosoIdAparelhoPareado(): Promise<string | null> {
  const pareado = await obterAparelhoPareado();
  return pareado?.idosoId ?? null;
}

/** Apaga a marca (fim da sessão). */
export async function esquecerAparelhoPareado(): Promise<void> {
  const store = await obterArmazenamento();
  if (!store) return;
  try {
    await store.deleteItemAsync(CHAVE_APARELHO_PAREADO);
  } catch (err) {
    console.warn('[aparelhoPareado] Não foi possível apagar o pareamento:', (err as Error)?.message);
  }
}
