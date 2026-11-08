import * as SQLite from 'expo-sqlite';
import type { TelemetriaLocalCache } from './telemetryDatabase';

let sqliteDb: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (sqliteDb) return sqliteDb;

  try {
    sqliteDb = SQLite.openDatabaseSync('seniorinsight_telemetry.db');
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS telemetria_local (
        idoso_id TEXT PRIMARY KEY,
        passos_hoje INTEGER NOT NULL DEFAULT 0,
        frequencia_cardiaca INTEGER NOT NULL DEFAULT 0,
        coletado_em TEXT,
        atualizado_em INTEGER NOT NULL
      );
    `);
    return sqliteDb;
  } catch (err: any) {
    console.warn('[telemetryDatabase.native] Falha ao abrir SQLite:', err?.message);
    return null;
  }
}

export async function salvarTelemetriaLocal(
  idosoId: string,
  dados: { passosHoje: number; frequenciaCardiaca: number; coletadoEm?: string | null }
): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO telemetria_local (idoso_id, passos_hoje, frequencia_cardiaca, coletado_em, atualizado_em)
       VALUES (?, ?, ?, ?, ?)`,
      [
        idosoId,
        dados.passosHoje || 0,
        dados.frequenciaCardiaca || 0,
        dados.coletadoEm || new Date().toISOString(),
        Date.now(),
      ]
    );
  } catch (err: any) {
    console.warn('[telemetryDatabase.native] Erro ao salvar telemetria local:', err?.message);
  }
}

export async function obterTelemetriaLocal(
  idosoId: string
): Promise<TelemetriaLocalCache | null> {
  const db = await getDatabase();
  if (!db) return null;

  try {
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM telemetria_local WHERE idoso_id = ?',
      [idosoId]
    );

    if (!row) return null;

    return {
      idosoId: row.idoso_id,
      passosHoje: row.passos_hoje,
      frequenciaCardiaca: row.frequencia_cardiaca,
      coletadoEm: row.coletado_em,
      atualizadoEm: row.atualizado_em,
    };
  } catch (err: any) {
    console.warn('[telemetryDatabase.native] Erro ao consultar telemetria local:', err?.message);
    return null;
  }
}

export async function limparTelemetriaLocal(): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.execAsync('DELETE FROM telemetria_local');
  } catch (err: any) {
    console.warn('[telemetryDatabase.native] Erro ao limpar telemetria local:', err?.message);
  }
}
