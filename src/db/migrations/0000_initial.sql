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

CREATE TABLE IF NOT EXISTS dream_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dream_id INTEGER NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding TEXT NOT NULL,
  chunk_idx INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dream_chunks_dream_id ON dream_chunks(dream_id);
CREATE INDEX IF NOT EXISTS idx_dreams_created_at ON dreams(created_at DESC);
