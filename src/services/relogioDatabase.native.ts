import * as SQLite from 'expo-sqlite';
import { apagarArquivoSqlite } from './sqliteArquivo';

const NOME_BANCO = 'seniorinsight_relogio.db';
let sqliteDb: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (sqliteDb) return sqliteDb;

  try {
    sqliteDb = SQLite.openDatabaseSync(NOME_BANCO);
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS relogio_sync (
        idoso_id TEXT PRIMARY KEY,
        ultima_sincronizacao TEXT NOT NULL,
        atualizado_em INTEGER NOT NULL
      );
    `);
    return sqliteDb;
  } catch (err: any) {
    console.warn('[relogioDatabase.native] Falha ao abrir SQLite:', err?.message);
    return null;
  }
}

export async function salvarSyncRelogioLocal(
  idosoId: string,
  timestampIso: string
): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO relogio_sync (idoso_id, ultima_sincronizacao, atualizado_em)
       VALUES (?, ?, ?)`,
      [idosoId, timestampIso, Date.now()]
    );
  } catch (err: any) {
    console.warn('[relogioDatabase.native] Erro ao salvar sync do relógio:', err?.message);
  }
}

export async function obterSyncRelogioLocal(idosoId: string): Promise<string | null> {
  const db = await getDatabase();
  if (!db) return null;

  try {
    const row = await db.getFirstAsync<{ ultima_sincronizacao: string }>(
      'SELECT ultima_sincronizacao FROM relogio_sync WHERE idoso_id = ?',
      [idosoId]
    );
    return row?.ultima_sincronizacao || null;
  } catch (err: any) {
    console.warn('[relogioDatabase.native] Erro ao consultar sync do relógio:', err?.message);
    return null;
  }
}

export async function limparSyncRelogioLocal(): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.execAsync('DELETE FROM relogio_sync');
  } catch (err: any) {
    console.warn('[relogioDatabase.native] Erro ao limpar sync:', err?.message);
  }
}

/** Exclusão da conta (HU-022): fecha e apaga o arquivo do banco. Lança se não conseguir. */
export async function apagarBancoRelogio(): Promise<void> {
  const conexao = sqliteDb;
  sqliteDb = null;
  await apagarArquivoSqlite(NOME_BANCO, conexao);
}
