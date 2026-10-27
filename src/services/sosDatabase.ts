import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Fallback de banco de dados para Web e ambientes não nativos (Node / Web bundler).
 * Evita o carregamento do módulo nativo expo-sqlite / wa-sqlite no browser.
 */
export async function getSosDatabase(): Promise<SQLiteDatabase | null> {
  return null;
}
