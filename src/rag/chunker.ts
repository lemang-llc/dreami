const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;

export interface TextChunk {
  text: string;
  index: number;
}

/**
 * Split text into overlapping chunks using a sliding window approach.
 * Tries to split at sentence/word boundaries when possible.
 */
export function chunkText(text: string): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);

    // Try to end at a sentence boundary (. ! ? \n) if not at end of text
    if (end < text.length) {
      const boundary = findBoundary(text, end);
      if (boundary > start + CHUNK_OVERLAP) {
        end = boundary;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push({ text: chunk, index });
      index++;
    }

    // Move forward by chunk size minus overlap
    start = end - CHUNK_OVERLAP;
    if (start <= 0) break; // Safety: avoid infinite loop
  }

  return chunks;
}

function findBoundary(text: string, near: number): number {
  // Search backwards from `near` for a sentence-ending character
  const searchStart = Math.max(near - 100, 0);
  const slice = text.slice(searchStart, near);

  // Look for '. ', '! ', '? ', '\n'
  const patterns = ['. ', '! ', '? ', '\n'];
  let bestPos = -1;

  for (const p of patterns) {
    const idx = slice.lastIndexOf(p);
    if (idx !== -1 && idx + searchStart > bestPos) {
      bestPos = idx + searchStart + p.length;
    }
  }

  return bestPos > 0 ? bestPos : near;
}
