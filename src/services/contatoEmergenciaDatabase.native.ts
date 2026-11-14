import * as SQLite from 'expo-sqlite';
import type { ContatoEmergencia } from './contatoEmergenciaService';
import { extrairMensagemErro } from './erroHelper';

let sqliteDb: SQLite.SQLiteDatabase | null = null;

export async function getContatosDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (sqliteDb) return sqliteDb;

  try {
    sqliteDb = SQLite.openDatabaseSync('seniorinsight_contatos.db');
    await sqliteDb.execAsync(`
      CREATE TABLE IF NOT EXISTS contatos_emergencia (
        id TEXT PRIMARY KEY,
        idoso_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        parentesco TEXT,
        telefone TEXT NOT NULL,
        ordem INTEGER NOT NULL,
        whatsapp INTEGER NOT NULL DEFAULT 1,
        iniciais TEXT,
        cor_avatar TEXT,
        cor_texto TEXT,
        ativo INTEGER NOT NULL DEFAULT 1
      );
    `);
    return sqliteDb;
  } catch (err: any) {
    console.warn('[contatoEmergenciaDatabase.native] Falha ao abrir SQLite:', err instanceof Error ? err.message : 'erro desconhecido');
    throw new Error(extrairMensagemErro(err));
  }
}

export async function salvarContatosNoCache(
  idosoId: string,
  contatos: ContatoEmergencia[]
): Promise<ContatoEmergencia[]> {
  const db = await getContatosDatabase();
  if (!db || !Array.isArray(contatos)) return contatos || [];

  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM contatos_emergencia WHERE idoso_id = ?', [idosoId]);
      for (const c of contatos) {
        await db.runAsync(
          `INSERT OR REPLACE INTO contatos_emergencia (
            id, idoso_id, nome, parentesco, telefone, ordem, whatsapp, iniciais, cor_avatar, cor_texto, ativo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id,
            idosoId,
            c.nome,
            c.parentesco || 'Familiar',
            c.telefone,
            c.ordem || 1,
            c.whatsapp ? 1 : 0,
            c.iniciais || 'CO',
            c.corAvatar || '#EEF2FF',
            c.corTexto || '#4338CA',
            c.ativo !== false ? 1 : 0,
          ]
        );
      }
    });
    return contatos;
  } catch (err: any) {
    console.warn('[contatoEmergenciaDatabase.native] falha no SQLite:', err instanceof Error ? err.message : 'erro desconhecido');
    throw new Error(extrairMensagemErro(err));
  }
}

export async function obterContatosDoCache(idosoId: string): Promise<ContatoEmergencia[]> {
  const db = await getContatosDatabase();
  if (!db) return [];

  try {
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM contatos_emergencia WHERE idoso_id = ? ORDER BY ordem ASC',
      [idosoId]
    );

    return (rows || []).map((row) => ({
      id: row.id,
      nome: row.nome,
      parentesco: row.parentesco,
      telefone: row.telefone,
      ordem: row.ordem,
      whatsapp: Boolean(row.whatsapp),
      iniciais: row.iniciais || 'CO',
      corAvatar: row.cor_avatar || '#EEF2FF',
      corTexto: row.cor_texto || '#4338CA',
      ativo: Boolean(row.ativo),
    }));
  } catch (err: any) {
    console.warn('[contatoEmergenciaDatabase.native] falha no SQLite:', err instanceof Error ? err.message : 'erro desconhecido');
    throw new Error(extrairMensagemErro(err));
  }
}

export async function limparContatosDoCache(idosoId?: string): Promise<void> {
  const db = await getContatosDatabase();
  if (!db) return;

  try {
    if (idosoId) {
      await db.runAsync('DELETE FROM contatos_emergencia WHERE idoso_id = ?', [idosoId]);
    } else {
      await db.runAsync('DELETE FROM contatos_emergencia');
    }
  } catch (err: any) {
    console.warn('[contatoEmergenciaDatabase.native] falha no SQLite:', err instanceof Error ? err.message : 'erro desconhecido');
    throw new Error(extrairMensagemErro(err));
  }
}
