import type { LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';
import { MODEL_PATHS } from './config';
import { isAdreno } from '../utils/platform';
import { fileExists } from '../utils/fileSystem';

let _context: LlamaContext | null = null;
let _initPromise: Promise<LlamaContext> | null = null;

function getGpuLayers(): number {
  if (Platform.OS === 'ios') {
    // Metal is the primary inference path on iOS/simulator — faster and
    // more reliable than CPU for this llama.cpp version.
    return 99;
  }
  // Android: Adreno → OpenCL GPU, others → CPU
  return isAdreno() ? 99 : 0;
}

export async function getLlmContext(): Promise<LlamaContext> {
  if (_context) return _context;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const exists = await fileExists(MODEL_PATHS.llm);
    if (!exists) {
      _initPromise = null;
      throw new Error('LLM model not downloaded. Complete onboarding first.');
    }
    const gpuLayers = getGpuLayers();
    const nCtx = 2048;
    console.log(`[LLM] Loading model: n_gpu_layers=${gpuLayers} n_ctx=${nCtx}`);
    try {
      const { initLlama } = await import('llama.rn');
      const ctx = await initLlama({
        model: MODEL_PATHS.llm,
        n_ctx: nCtx,
        n_gpu_layers: gpuLayers,
        n_batch: 128,
        flash_attn: gpuLayers > 0,
        use_mmap: true,
        use_mlock: false,
      });
      console.log('[LLM] Model loaded successfully');
      _context = ctx;
      return ctx;
    } catch (e) {
      console.error('[LLM] initLlama failed:', e);
      _initPromise = null;
      throw e;
    }
  })();

  return _initPromise;
}

export function isLlmLoaded(): boolean {
  return _context !== null;
}

export function isLlmLoading(): boolean {
  return _initPromise !== null && _context === null;
}

export async function releaseLlmContext(): Promise<void> {
  if (_context) {
    await _context.release();
    _context = null;
    _initPromise = null;
  }
}
