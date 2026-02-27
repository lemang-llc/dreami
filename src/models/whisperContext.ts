import { initWhisper, WhisperContext } from 'whisper.rn';
import { MODEL_PATHS } from './config';

let _context: WhisperContext | null = null;
let _initPromise: Promise<WhisperContext> | null = null;

export async function getWhisperContext(): Promise<WhisperContext> {
  if (_context) return _context;
  if (_initPromise) return _initPromise;

  _initPromise = initWhisper({
    filePath: MODEL_PATHS.whisper,
    // whisper.rn auto-detects the Core ML encoder on iOS if the
    // .mlmodelc directory exists alongside the .bin file
  }).then((ctx: WhisperContext) => {
    _context = ctx;
    return ctx;
  });

  return _initPromise;
}

export async function releaseWhisperContext(): Promise<void> {
  if (_context) {
    await _context.release();
    _context = null;
    _initPromise = null;
  }
}
