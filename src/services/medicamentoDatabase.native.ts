import * as SQLite from 'expo-sqlite';
import type { RotinaCache, RotinaCacheInput } from './medicamentoDatabase';

let sqliteDb: SQLite.SQLiteDatabase | null = null;

interface RotinaCacheRow {
  id: string;
  idoso_id: string;
  medicamento_nome: string;
  dosagem: string;
  horario: string;
  frequencia: string;
  dias_semana: string;
  tipo_formato: string;
  instrucoes: string;
  observacoes: string;
  ativo: number;
  status_hoje: string;
  horario_ingestao_hoje: string | null;
  atualizado_em: number;
}

/**
 * Conexão SQLite nativa (Android / iOS development build) para persistência offline da agenda de medicamentos (RF-038).
 */
export async function getMedicamentoDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (sqliteDb) {
    return sqliteDb;
  }

  try {
    sqliteDb = SQLite.openDatabaseSync('seniorinsight_medicamentos.db');
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS rotinas_medicamentos_cache (
        id TEXT PRIMARY KEY,
        idoso_id TEXT NOT NULL,
        medicamento_nome TEXT NOT NULL,
        dosagem TEXT NOT NULL,
        horario TEXT NOT NULL,
        frequencia TEXT,
        dias_semana TEXT,
        tipo_formato TEXT,
        instrucoes TEXT,
        observacoes TEXT,
        ativo INTEGER NOT NULL DEFAULT 1,
        status_hoje TEXT NOT NULL DEFAULT 'PENDENTE',
        horario_ingestao_hoje TEXT,
        atualizado_em INTEGER NOT NULL
      );
    `);
    return sqliteDb;
  } catch (err: any) {
    console.warn('[medicamentoDatabase.native] Falha ao inicializar SQLite nativo:', err?.message);
    return null;
  }
}

/**
 * Salva ou atualiza uma lista de rotinas no cache SQLite local
 */
export async function salvarRotinasNoCache(
  idosoId: string,
  rotinas: RotinaCacheInput[] = []
): Promise<RotinaCache[]> {
  if (!Array.isArray(rotinas) || rotinas.length === 0) return [];

  const db = await getMedicamentoDatabase();
  if (!db) return rotinas as RotinaCache[];

  try {
    for (const r of rotinas) {
      const nome = r.medicamentoNome || r.nomeMedicamento || '';
      const horario = r.horario || '08:00';
      const dosagem = r.dosagem || '';
      const frequencia = r.frequencia || '1x ao dia (Diário)';
      const diasSemana = r.diasSemana || 'TODOS';
      const tipoFormato = r.tipoFormato || 'comprimido';
      const instrucoes = r.instrucoes || '';
      const observacoes = r.observacoes || '';
      const ativo = r.ativo === false ? 0 : 1;
      const statusHoje = r.statusHoje || 'PENDENTE';
      const horarioIngestao = r.horarioIngestaoHoje || null;
      const agora = Date.now();

      await db.runAsync(
        `INSERT OR REPLACE INTO rotinas_medicamentos_cache
        (id, idoso_id, medicamento_nome, dosagem, horario, frequencia, dias_semana, tipo_formato, instrucoes, observacoes, ativo, status_hoje, horario_ingestao_hoje, atualizado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id ?? null,
          idosoId,
          nome,
          dosagem,
          horario,
          frequencia,
          diasSemana,
          tipoFormato,
          instrucoes,
          observacoes,
          ativo,
          statusHoje,
          horarioIngestao,
          agora,
        ]
      );
    }
  } catch (err: any) {
    console.warn('[medicamentoDatabase.native] Erro ao gravar rotinas no SQLite:', err?.message);
  }

  return obterRotinasDoCache(idosoId);
}

/**
 * Obtém todas as rotinas salvas no SQLite para o idoso ordenadas por horário
 */
export async function obterRotinasDoCache(idosoId: string): Promise<RotinaCache[]> {
  const db = await getMedicamentoDatabase();
  if (!db) return [];

  try {
    const rows = await db.getAllAsync<RotinaCacheRow>(
      `SELECT * FROM rotinas_medicamentos_cache WHERE idoso_id = ? ORDER BY horario ASC`,
      [idosoId]
    );

    return rows.map((row) => ({
      id: row.id,
      idosoId: row.idoso_id,
      medicamentoNome: row.medicamento_nome,
      nomeMedicamento: row.medicamento_nome,
      dosagem: row.dosagem,
      horario: row.horario,
      frequencia: row.frequencia,
      diasSemana: row.dias_semana,
      tipoFormato: row.tipo_formato,
      instrucoes: row.instrucoes,
      observacoes: row.observacoes,
      ativo: Boolean(row.ativo),
      statusHoje: row.status_hoje,
      horarioIngestaoHoje: row.horario_ingestao_hoje,
      atualizadoEm: row.atualizado_em,
    }));
  } catch (err: any) {
    console.warn('[medicamentoDatabase.native] Erro ao consultar SQLite:', err?.message);
    return [];
  }
}

/**
 * Atualiza o status de ingestão de um remédio no SQLite local
 */
export async function atualizarStatusDoseCache(
  rotinaId: string,
  status = 'TOMADO',
  horarioIngestao: string | null = null
): Promise<boolean> {
  const db = await getMedicamentoDatabase();
  if (!db) return false;

  try {
    await db.runAsync(
      `UPDATE rotinas_medicamentos_cache
       SET status_hoje = ?, horario_ingestao_hoje = ?, atualizado_em = ?
       WHERE id = ?`,
      [status, horarioIngestao, Date.now(), rotinaId]
    );
    return true;
  } catch (err: any) {
    console.warn('[medicamentoDatabase.native] Erro ao atualizar status no SQLite:', err?.message);
    return false;
  }
}

/**
 * Remove uma rotina do banco SQLite
 */
export async function removerRotinaCache(rotinaId: string): Promise<boolean> {
  const db = await getMedicamentoDatabase();
  if (!db) return false;

  try {
    await db.runAsync(`DELETE FROM rotinas_medicamentos_cache WHERE id = ?`, [rotinaId]);
    return true;
  } catch (err: any) {
    console.warn('[medicamentoDatabase.native] Erro ao remover do SQLite:', err?.message);
    return false;
  }
}

/**
 * Limpa toda a tabela de medicamentos (útil para testes ou logout)
 */
export async function limparCacheMedicamentos(): Promise<void> {
  const db = await getMedicamentoDatabase();
  if (!db) return;

  try {
    await db.execAsync(`DELETE FROM rotinas_medicamentos_cache`);
  } catch (err: any) {
    console.warn('[medicamentoDatabase.native] Erro ao limpar cache SQLite:', err?.message);
  }
}
