import { initLlama, LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';
import { MODEL_PATHS } from './config';
import { isAdreno } from '../utils/platform';

let _context: LlamaContext | null = null;
let _initPromise: Promise<LlamaContext> | null = null;

export async function getEmbedContext(): Promise<LlamaContext> {
  if (_context) return _context;
  if (_initPromise) return _initPromise;

  const nGpuLayers =
    Platform.OS === 'ios' ? 99 : isAdreno() ? 99 : 0;

  _initPromise = initLlama({
    model: MODEL_PATHS.embedding,
    embedding: true,
    n_ctx: 512,
    n_gpu_layers: nGpuLayers,
  }).then((ctx) => {
    _context = ctx;
    return ctx;
  });

  return _initPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const ctx = await getEmbedContext();
  const result = await ctx.embedding(text);
  return result.embedding;
}

export async function releaseEmbedContext(): Promise<void> {
  if (_context) {
    await _context.release();
    _context = null;
    _initPromise = null;
  }
}
