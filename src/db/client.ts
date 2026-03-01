import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS dreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  title TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '',
  audio_path TEXT,
  summary TEXT,
  mood TEXT,
  tags TEXT DEFAULT '[]',
  is_processed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON dreams(created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS dream_search USING fts5(
  transcript,
  tokenize='porter ascii'
);

CREATE TABLE IF NOT EXISTS dream_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dream_id INTEGER NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding BLOB NOT NULL,
  UNIQUE(dream_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_dream_chunks_dream_id ON dream_chunks(dream_id);
`;

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

  _sqlite = await SQLite.openDatabaseAsync('dream-diary.db');

  await _sqlite.execAsync('PRAGMA journal_mode = WAL;');
  await _sqlite.execAsync('PRAGMA foreign_keys = ON;');
  await _sqlite.execAsync(MIGRATION_SQL);

  _db = drizzle(_sqlite, { schema });

  // Pre-warm drizzle's internal result-mapping code by running a trivial query
  // at startup while the native JS thread stack is shallow. This forces Hermes
  // to lazily compile drizzle's forEach-based row mappers now, so later calls
  // (triggered deep inside the React event loop) don't hit a stack overflow.
  await _db.select().from(schema.appSettings).limit(1);

  return _db;
}

export function getSqliteDb() {
  return _sqlite;
}
