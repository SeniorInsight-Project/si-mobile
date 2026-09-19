import * as SQLite from 'expo-sqlite';

export const localDatabaseName = 'health_monitoring.db';

export function openLocalDatabase() {
  return SQLite.openDatabaseSync(localDatabaseName);
}
