import { getSqliteDb, getDatabase } from '../db/client';
import { dreams } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getEmbedContext, releaseEmbedContext } from '../models/embedContext';
import { fileExists } from '../utils/fileSystem';
import { MODEL_PATHS } from '../models/config';

export interface RetrievedChunk {
  dreamId: number;
  dreamTitle: string;
  dreamCreatedAt: string;
  chunkText: string;
  score: number;
}

/**
 * Deserialize a SQLite BLOB back to Float32Array.
 * DataView reads are alignment-safe regardless of byte offset — expo-sqlite
 * may return a Uint8Array that is a slice of a larger buffer.
 */
function bytesToFloat32(bytes: Uint8Array): Float32Array {
  const result = new Float32Array(bytes.byteLength / 4);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < result.length; i++) {
    result[i] = dv.getFloat32(i * 4, true); // little-endian, matches floatsToBytes
  }
  return result;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

/**
 * Semantic search over stored vector embeddings.
 *
 * Memory-safe design:
 *  - Embed model loads only to compute the query vector, then is RELEASED
 *    before the cosine loop starts — so it never overlaps with LLM memory
 *    during the generation phase of sendChatMessage().
 *  - Stored embeddings arrive as Uint8Array BLOBs (native memory, not Hermes
 *    heap). Float32Array views of those bytes are also in native memory.
 *  - No Hermes arrayPrototypePush calls happen during retrieval.
 *
 * Returns empty array if the embed model is not downloaded or no embeddings
 * have been indexed yet.
 */
export async function semanticSearch(
  question: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const modelExists = await fileExists(MODEL_PATHS.embedding);
  if (!modelExists) return [];

  const sqlite = getSqliteDb();
  if (!sqlite) return [];

  const countRow = await sqlite.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM dream_chunks',
  );
  if (!countRow || countRow.c === 0) return [];

  // Compute query embedding, then IMMEDIATELY release the embed context
  // so it does not sit in memory alongside the LLM during generation.
  const ctx = await getEmbedContext();
  const queryResult = await ctx.embedding(question);
  const queryVec = new Float32Array(queryResult.embedding); // copies to native ArrayBuffer
  // queryResult.embedding (number[]) can now be GC'd
  await releaseEmbedContext();

  type Row = { dream_id: number; chunk_text: string; embedding: Uint8Array };
  const rows = await sqlite.getAllAsync<Row>(
    'SELECT dream_id, chunk_text, embedding FROM dream_chunks',
  );

  // Score all chunks — Uint8Array BLOBs and Float32Array views live in native
  // memory so there is no Hermes heap pressure during this loop.
  const scored = rows
    .map((row) => ({
      dreamId: row.dream_id,
      chunkText: row.chunk_text,
      score: cosine(queryVec, bytesToFloat32(row.embedding)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((s) => s.score > 0.25); // minimum meaningful similarity

  if (scored.length === 0) return [];

  const db = getDatabase();
  const results: RetrievedChunk[] = [];
  for (const s of scored) {
    const [d] = await db
      .select({ id: dreams.id, title: dreams.title, createdAt: dreams.createdAt })
      .from(dreams)
      .where(eq(dreams.id, s.dreamId));
    if (d) {
      results.push({
        dreamId: d.id,
        dreamTitle: d.title,
        dreamCreatedAt: d.createdAt,
        chunkText: s.chunkText,
        score: s.score,
      });
    }
  }
  return results;
}
