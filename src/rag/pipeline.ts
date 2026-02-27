import { getDatabase } from '../db/client';
import { dreams, dreamChunks } from '../db/schema';
import { chunkText } from './chunker';
import { embedChunk } from './embedder';
import { retrieveChunks, RetrievedChunk } from './retriever';
import { embedText } from '../models/embedContext';
import { eq } from 'drizzle-orm';

/**
 * Index a dream entry into the vector store.
 * Chunks the transcript, embeds each chunk, stores in dream_chunks.
 */
export async function indexDream(
  dreamId: number,
  transcript: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (!transcript || transcript.trim().length === 0) return;

  const db = getDatabase();

  // Delete any existing chunks for this dream (re-indexing)
  await db.delete(dreamChunks).where(eq(dreamChunks.dreamId, dreamId));

  const chunks = chunkText(transcript);
  if (chunks.length === 0) return;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedChunk(chunk.text);

    await db.insert(dreamChunks).values({
      dreamId,
      chunkText: chunk.text,
      embedding: JSON.stringify(embedding),
      chunkIdx: chunk.index,
    });

    onProgress?.(i + 1, chunks.length);
  }

  // Mark dream as processed
  await db
    .update(dreams)
    .set({ isProcessed: true, updatedAt: new Date().toISOString() })
    .where(eq(dreams.id, dreamId));
}

/**
 * Query the dream journal with a natural language question.
 * Returns top-K relevant chunks for use in LLM context.
 */
export async function queryDreams(
  question: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(question);
  return retrieveChunks(queryEmbedding, topK);
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
