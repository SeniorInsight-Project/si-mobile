import * as SQLite from 'expo-sqlite';
import type { TelemetriaLocal } from './telemetriaLocalDatabase';

/**
 * Cache SQLite do estado de hoje do idoso (HU-030). Colunas de valor aceitam NULL: sem leitura,
 * o cache guarda NULL, e a tela mostra "sem dados".
 * Erros sobem: quem chama decide (a tela segue sem cache e registra o aviso).
 */
const NOME_BANCO = 'seniorinsight_telemetria.db';
let sqliteDb: SQLite.SQLiteDatabase | null = null;

interface TelemetriaLocalRow {
  idoso_id: string;
  passos_hoje: number | null;
  frequencia_cardiaca: number | null;
  coletado_em: string | null;
  consentimento_passos: number | null;
  consentimento_batimentos: number | null;
}

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (sqliteDb) return sqliteDb;
  const db = SQLite.openDatabaseSync(NOME_BANCO);
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS telemetria_local (
      idoso_id TEXT PRIMARY KEY,
      passos_hoje INTEGER,
      frequencia_cardiaca INTEGER,
      coletado_em TEXT,
      consentimento_passos INTEGER,
      consentimento_batimentos INTEGER,
      atualizado_em INTEGER NOT NULL
    );
  `);
  sqliteDb = db;
  return db;
}

const paraInteiro = (valor: boolean | undefined): number | null => (valor === undefined ? null : valor ? 1 : 0);

export async function obterTelemetriaLocal(idosoId: string): Promise<TelemetriaLocal | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TelemetriaLocalRow>('SELECT * FROM telemetria_local WHERE idoso_id = ?', [idosoId]);
  if (!row) return null;
  const temConsentimento = row.consentimento_passos !== null && row.consentimento_batimentos !== null;
  return {
    idosoId: row.idoso_id,
    passosHoje: row.passos_hoje,
    frequenciaCardiaca: row.frequencia_cardiaca,
    coletadoEm: row.coletado_em,
    consentimento: temConsentimento
      ? { passos: row.consentimento_passos === 1, batimentos: row.consentimento_batimentos === 1 }
      : null,
  };
}

export async function salvarTelemetriaLocal(registro: TelemetriaLocal): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO telemetria_local
      (idoso_id, passos_hoje, frequencia_cardiaca, coletado_em, consentimento_passos, consentimento_batimentos, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      registro.idosoId,
      registro.passosHoje,
      registro.frequenciaCardiaca,
      registro.coletadoEm,
      paraInteiro(registro.consentimento?.passos),
      paraInteiro(registro.consentimento?.batimentos),
      Date.now(),
    ]
  );
}

/** Sem `idosoId`, apaga tudo. */
export async function limparTelemetriaLocal(idosoId?: string): Promise<void> {
  const db = await getDatabase();
  if (idosoId) await db.runAsync('DELETE FROM telemetria_local WHERE idoso_id = ?', [idosoId]);
  else await db.execAsync('DELETE FROM telemetria_local');
}
