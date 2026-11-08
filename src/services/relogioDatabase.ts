/**
 * Fallback em memória para Web e testes Node.js.
 */
let relogioSyncMap = new Map<string, string>();

export async function salvarSyncRelogioLocal(
  idosoId: string,
  timestampIso: string
): Promise<void> {
  relogioSyncMap.set(idosoId, timestampIso);
}

export async function obterSyncRelogioLocal(idosoId: string): Promise<string | null> {
  return relogioSyncMap.get(idosoId) || null;
}

export async function limparSyncRelogioLocal(): Promise<void> {
  relogioSyncMap.clear();
}
