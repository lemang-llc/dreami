import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: SQLite.SQLiteDatabase | null = null;

export function getDatabase() {
  if (!_db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

export async function initDatabase(): Promise<ReturnType<typeof drizzle>> {
  if (_db) return _db;

  _sqlite = await SQLite.openDatabaseAsync('dream-diary.db', {
    enableChangeListener: true,
  });

  // Run WAL mode for better concurrent read performance
  await _sqlite.execAsync('PRAGMA journal_mode = WAL;');
  await _sqlite.execAsync('PRAGMA foreign_keys = ON;');

  _db = drizzle(_sqlite, { schema });
  return _db;
}

export function getSqliteDb() {
  return _sqlite;
}
