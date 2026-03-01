import type { LlamaContext } from 'llama.rn';
import { MODEL_PATHS } from './config';
import { fileExists } from '../utils/fileSystem';

let _context: LlamaContext | null = null;
let _initPromise: Promise<LlamaContext> | null = null;

export async function getEmbedContext(): Promise<LlamaContext> {
  if (_context) return _context;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const exists = await fileExists(MODEL_PATHS.embedding);
    if (!exists) {
      _initPromise = null;
      throw new Error('Embedding model not downloaded.');
    }
    const { initLlama } = await import('llama.rn');
    const ctx = await initLlama({
      model: MODEL_PATHS.embedding,
      embedding: true,
      n_ctx: 512,
      n_gpu_layers: 0, // CPU-only: embeddings are not latency-sensitive
    });
    _context = ctx;
    return ctx;
  })();

  return _initPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const ctx = await getEmbedContext();
  const result = await ctx.embedding(text);
  return result.embedding;
}

export function isEmbedLoaded(): boolean {
  return _context !== null;
}

export function isEmbedLoading(): boolean {
  return _initPromise !== null && _context === null;
}

export async function releaseEmbedContext(): Promise<void> {
  if (_context) {
    await _context.release();
    _context = null;
    _initPromise = null;
  }
}
