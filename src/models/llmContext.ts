import { initLlama, LlamaContext } from 'llama.rn';
import { Platform } from 'react-native';
import { MODEL_PATHS } from './config';
import { isAdreno } from '../utils/platform';

let _context: LlamaContext | null = null;
let _initPromise: Promise<LlamaContext> | null = null;

function getGpuLayers(): number {
  if (Platform.OS === 'ios') {
    return 99; // Full Metal offload
  }
  // Android: Adreno → OpenCL GPU, others → CPU
  return isAdreno() ? 99 : 0;
}

export async function getLlmContext(): Promise<LlamaContext> {
  if (_context) return _context;
  if (_initPromise) return _initPromise;

  _initPromise = initLlama({
    model: MODEL_PATHS.llm,
    n_ctx: 4096,
    n_gpu_layers: getGpuLayers(),
    n_batch: 512,
  }).then((ctx) => {
    _context = ctx;
    return ctx;
  });

  return _initPromise;
}

export async function releaseLlmContext(): Promise<void> {
  if (_context) {
    await _context.release();
    _context = null;
    _initPromise = null;
  }
}
