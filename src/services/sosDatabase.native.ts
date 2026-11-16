import * as SQLite from 'expo-sqlite';
import { apagarArquivoSqlite } from './sqliteArquivo';

const NOME_BANCO = 'seniorinsight_sos.db';
let sqliteDb: SQLite.SQLiteDatabase | null = null;

/**
 * Conexão SQLite nativa (Android / iOS development build) para cache e fila offline do SOS (RNF de offline).
 * IMPORTANTE: Tokens (access/refresh) nunca devem ser salvos no SQLite; utilize sempre `expo-secure-store`.
 */
export async function getSosDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (sqliteDb) {
    return sqliteDb;
  }

  try {
    sqliteDb = SQLite.openDatabaseSync(NOME_BANCO);
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS sos_fila (
        idempotency_key TEXT PRIMARY KEY,
        idoso_id TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        nivel_bateria INTEGER,
        observacao TEXT,
        status TEXT NOT NULL,
        criado_em INTEGER NOT NULL,
        tentativas INTEGER NOT NULL DEFAULT 0,
        ultimo_erro TEXT
      );
    `);
    return sqliteDb;
  } catch (err: any) {
    console.warn('[sosDatabase.native] Falha ao inicializar SQLite nativo:', err?.message);
    return null;
  }
}

/**
 * Apaga a fila offline do SOS (usado no logout).
 */
export async function limparFilaSos(): Promise<void> {
  const db = await getSosDatabase();
  if (!db) return;

  try {
    await db.execAsync('DELETE FROM sos_fila');
  } catch (err: any) {
    console.warn('[sosDatabase.native] Erro ao limpar fila SQLite:', err?.message);
  }
}

/** Exclusão da conta (HU-022): fecha e apaga o arquivo do banco. Lança se não conseguir. */
export async function apagarBancoSos(): Promise<void> {
  const conexao = sqliteDb;
  sqliteDb = null;
  await apagarArquivoSqlite(NOME_BANCO, conexao);
}
