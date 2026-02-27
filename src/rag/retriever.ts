import { getDatabase } from '../db/client';
import { dreamChunks, dreams } from '../db/schema';
import { cosineSimilarity } from '../utils/cosine';
import { eq } from 'drizzle-orm';

export interface RetrievedChunk {
  dreamId: number;
  dreamTitle: string;
  dreamCreatedAt: string;
  chunkText: string;
  score: number;
}

/**
 * Retrieve top-K chunks most similar to the query embedding.
 * Uses linear scan + cosine similarity (fast enough for personal journals).
 */
export async function retrieveChunks(
  queryEmbedding: number[],
  topK = 5
): Promise<RetrievedChunk[]> {
  const db = getDatabase();

  // Load all chunks with their dream metadata
  const rows = await db
    .select({
      id: dreamChunks.id,
      dreamId: dreamChunks.dreamId,
      chunkText: dreamChunks.chunkText,
      embedding: dreamChunks.embedding,
      title: dreams.title,
      createdAt: dreams.createdAt,
    })
    .from(dreamChunks)
    .innerJoin(dreams, eq(dreamChunks.dreamId, dreams.id));

  if (rows.length === 0) return [];

  // Score each chunk
  const scored = rows.map((row) => {
    const embedding: number[] = JSON.parse(row.embedding);
    const score = cosineSimilarity(queryEmbedding, embedding);
    return {
      dreamId: row.dreamId,
      dreamTitle: row.title,
      dreamCreatedAt: row.createdAt,
      chunkText: row.chunkText,
      score,
    };
  });

  // Sort by score descending and take top-K
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
