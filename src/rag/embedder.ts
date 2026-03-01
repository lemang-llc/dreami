import { getSqliteDb } from '../db/client';
import { getEmbedContext, releaseEmbedContext } from '../models/embedContext';
import { fileExists } from '../utils/fileSystem';
import { MODEL_PATHS } from '../models/config';
import { chunkText } from './chunker';

/** Yield time between chunks so HadesGC can collect the previous float array. */
const GC_YIELD_MS = 350;

/**
 * Convert a number[] of floats to a Uint8Array for storage as a SQLite BLOB.
 *
 * Uses DataView.setFloat32 (little-endian) rather than new Float32Array(floats)
 * so we never create an intermediate typed-array copy that the Hermes GC must
 * also track. The output bytes live in a native ArrayBuffer outside Hermes heap.
 */
function floatsToBytes(floats: number[]): Uint8Array {
  const buf = new ArrayBuffer(floats.length * 4);
  const dv = new DataView(buf);
  for (let i = 0; i < floats.length; i++) {
    dv.setFloat32(i * 4, floats[i], true); // little-endian
  }
  return new Uint8Array(buf);
}

/**
 * Embed a dream's transcript and store each chunk's embedding in SQLite.
 *
 * Crash-safety measures that prevent HadesGC OOM:
 *  1. One chunk at a time — the number[] from ctx.embedding() is never
 *     accumulated across loop iterations; it goes out of scope after floatsToBytes().
 *  2. floatsToBytes() immediately moves the data to a native ArrayBuffer
 *     (outside the Hermes managed heap) before the next embedding starts.
 *  3. GC_YIELD_MS pause between chunks gives HadesGC time to reclaim the
 *     previous float array before a new one lands on the nursery.
 *  4. Embed context is released at the end — it is only needed for batch
 *     indexing and should not stay resident alongside the LLM.
 *
 * Silently no-ops if the embedding model is not downloaded.
 */
export async function embedAndStore(
  dreamId: number,
  transcript: string,
  onProgress?: (p: number) => void,
): Promise<void> {
  if (!transcript || transcript.length < 20) {
    onProgress?.(1);
    return;
  }

  const modelExists = await fileExists(MODEL_PATHS.embedding);
  if (!modelExists) {
    onProgress?.(1);
    return;
  }

  const sqlite = getSqliteDb();
  if (!sqlite) return;

  // Clear any previous embeddings for this dream before re-indexing
  await sqlite.runAsync('DELETE FROM dream_chunks WHERE dream_id = ?', [dreamId]);

  const chunks = chunkText(transcript);
  const ctx = await getEmbedContext();

  try {
    for (let i = 0; i < chunks.length; i++) {
      // ctx.embedding returns { embedding: number[] } — 768 floats in Hermes heap
      const result = await ctx.embedding(chunks[i]);

      // Immediately serialize to bytes — from here the number[] can be GC'd
      const bytes = floatsToBytes(result.embedding);

      await sqlite.runAsync(
        'INSERT INTO dream_chunks(dream_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?)',
        [dreamId, i, chunks[i], bytes],
      );

      onProgress?.((i + 1) / chunks.length);

      // Explicit GC yield between chunks
      if (i < chunks.length - 1) {
        await new Promise<void>((r) => setTimeout(r, GC_YIELD_MS));
      }
    }
  } finally {
    // Always release: embed model should not stay loaded alongside the LLM
    await releaseEmbedContext();
  }
}
