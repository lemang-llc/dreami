import { getDatabase, getSqliteDb } from '../db/client';
import { dreams } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { RetrievedChunk } from './retriever';
import { semanticSearch } from './retriever';
import { embedAndStore } from './embedder';

// Re-export so existing importers (chat.ts, etc.) keep working unchanged.
export type { RetrievedChunk };

/**
 * Index a dream into the FTS5 full-text search table.
 * Instant — no model loading required.
 */
export async function indexDream(dreamId: number, transcript: string): Promise<void> {
  if (!transcript || transcript.length === 0) return;

  const sqlite = getSqliteDb();
  if (!sqlite) throw new Error('Database not initialized.');

  await sqlite.runAsync(
    'INSERT OR REPLACE INTO dream_search(rowid, transcript) VALUES (?, ?)',
    [dreamId, transcript],
  );
}

/**
 * Embed a dream's transcript and stage each chunk as a BLOB in SQLite.
 * Crash-safe: one chunk at a time with explicit GC yields.
 * Silently skips if the embedding model is not downloaded.
 */
export async function embedDream(
  dreamId: number,
  transcript: string,
  onProgress?: (p: number) => void,
): Promise<void> {
  return embedAndStore(dreamId, transcript, onProgress);
}

/**
 * Remove a dream from both search indexes (called on dream delete).
 */
export async function removeDreamFromIndex(dreamId: number): Promise<void> {
  const sqlite = getSqliteDb();
  if (!sqlite) return;
  await sqlite.runAsync('DELETE FROM dream_search WHERE rowid = ?', [dreamId]);
  await sqlite.runAsync('DELETE FROM dream_chunks WHERE dream_id = ?', [dreamId]);
}

/**
 * Query the dream journal with a natural language question.
 *
 * Strategy:
 *  1. Try semantic vector search (requires embed model + indexed embeddings).
 *     This finds thematically related dreams even without exact word matches.
 *  2. Fall back to FTS5 keyword search if embeddings are not available.
 */
export async function queryDreams(
  question: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const semantic = await semanticSearch(question, topK);
  if (semantic.length > 0) return semantic;

  return ftsSearch(question, topK);
}

export async function ftsSearch(
  question: string,
  topK: number,
): Promise<RetrievedChunk[]> {
  const sqlite = getSqliteDb();
  if (!sqlite) return [];

  const ftsQuery = question.replace(/['"*^()]/g, ' ').trim();
  if (!ftsQuery) return [];

  type FtsRow = { rowid: number; snippet: string };
  let rows: FtsRow[] = [];
  try {
    rows = await sqlite.getAllAsync<FtsRow>(
      `SELECT rowid,
              snippet(dream_search, 0, '', '', '…', 32) AS snippet
       FROM dream_search
       WHERE dream_search MATCH ?
       ORDER BY rank
       LIMIT ?`,
      [ftsQuery, topK],
    );
  } catch {
    return [];
  }

  if (rows.length === 0) return [];

  const db = getDatabase();
  const results: RetrievedChunk[] = [];
  for (const row of rows) {
    const [dream] = await db
      .select({ id: dreams.id, title: dreams.title, createdAt: dreams.createdAt })
      .from(dreams)
      .where(eq(dreams.id, row.rowid));
    if (dream) {
      results.push({
        dreamId: dream.id,
        dreamTitle: dream.title,
        dreamCreatedAt: dream.createdAt,
        chunkText: row.snippet,
        score: 1,
      });
    }
  }
  return results;
}

/**
 * Format retrieved chunks as context string for LLM prompt.
 */
export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return 'No relevant dreams found.';

  return chunks
    .map((chunk, i) => {
      const date = new Date(chunk.dreamCreatedAt).toLocaleDateString();
      return `[Dream ${i + 1} — "${chunk.dreamTitle}" (${date})]\n${chunk.chunkText}`;
    })
    .join('\n\n---\n\n');
}
