import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Fallback de banco de dados para Web e ambientes não nativos (Node / Web bundler).
 * Evita o carregamento do módulo nativo expo-sqlite / wa-sqlite no browser.
 */
export async function getSosDatabase(): Promise<SQLiteDatabase | null> {
  return null;
}

export async function limparFilaSos(): Promise<void> {
  // Sem SQLite fora do nativo: nada a limpar.
}

export async function apagarBancoSos(): Promise<void> {
  // Sem SQLite fora do nativo: a fila fica só na memória do sosQueueService.
}
