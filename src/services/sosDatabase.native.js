import * as SQLite from 'expo-sqlite';

let sqliteDb = null;

/**
 * Conexão SQLite nativa (Android / iOS development build) para cache e fila offline do SOS (RNF de offline).
 * IMPORTANTE: Tokens (access/refresh) nunca devem ser salvos no SQLite; utilize sempre `expo-secure-store`.
 */
export async function getSosDatabase() {
  if (sqliteDb) {
    return sqliteDb;
  }

  try {
    sqliteDb = SQLite.openDatabaseSync('seniorinsight_sos.db');
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
  } catch (err) {
    console.warn('[sosDatabase.native] Falha ao inicializar SQLite nativo:', err.message);
    return null;
  }
}
