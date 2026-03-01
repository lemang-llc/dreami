/**
 * Split a transcript into overlapping word-window chunks for embedding.
 * Simple word-based splitter — no NLP dependencies required.
 */
export function chunkText(
  text: string,
  maxWords = 120,
  overlapWords = 20,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start += maxWords - overlapWords;
  }
  return chunks;
}
