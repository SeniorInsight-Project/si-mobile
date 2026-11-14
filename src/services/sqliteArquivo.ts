import * as SQLite from 'expo-sqlite';

/**
 * Fecha a conexão e apaga o arquivo do banco (com -wal, -shm e -journal). Usado só pelos módulos
 * `*.native.ts`, na exclusão da conta (HU-022).
 *
 * O expo-sqlite recusa apagar um banco aberto e também um que não existe; por isso, sem conexão em
 * cache, o banco é aberto antes (o que cria o arquivo vazio) e fechado em seguida. Lança se não
 * conseguir apagar: quem chama registra a falha e segue com os outros bancos.
 */
export async function apagarArquivoSqlite(nome: string, conexao: SQLite.SQLiteDatabase | null): Promise<void> {
  const db = conexao ?? SQLite.openDatabaseSync(nome);
  await db.closeAsync();
  await SQLite.deleteDatabaseAsync(nome);
}
