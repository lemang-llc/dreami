import type { WhisperContext } from 'whisper.rn';
import { MODEL_PATHS } from './config';

let _context: WhisperContext | null = null;
let _initPromise: Promise<WhisperContext> | null = null;

export async function getWhisperContext(): Promise<WhisperContext> {
  if (_context) return _context;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const { initWhisper } = await import('whisper.rn');
    const ctx = await initWhisper({
      filePath: MODEL_PATHS.whisper,
    });
    _context = ctx;
    return ctx;
  })();

  return _initPromise;
}

export function isWhisperLoaded(): boolean {
  return _context !== null;
}

export async function releaseWhisperContext(): Promise<void> {
  if (_context) {
    await _context.release();
    _context = null;
    _initPromise = null;
  }
}
