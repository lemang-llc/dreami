import { embedText } from '../models/embedContext';

export async function embedChunk(text: string): Promise<number[]> {
  return embedText(text);
}

export async function embedBatch(
  texts: string[],
  onProgress?: (done: number, total: number) => void
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    const embedding = await embedText(texts[i]);
    embeddings.push(embedding);
    onProgress?.(i + 1, texts.length);
  }

  return embeddings;
}
