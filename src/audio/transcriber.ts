import { Platform } from 'react-native';
import { getWhisperContext, releaseWhisperContext } from '../models/whisperContext';

export interface TranscriptionResult {
  text: string;
  segments?: Array<{ start: number; end: number; text: string }>;
}

// Whisper (especially small models) hallucinates these strings on silence or
// ambient noise.  Strip them so the VAD loop doesn't forward noise artifacts
// to the LLM as if they were real speech.
const HALLUCINATION_RE = /^[\s.,!?…\-–—()\[\]]*$|^\[.*\]$|^\(.*\)$/i;
const HALLUCINATION_PHRASES = new Set([
  'thank you',
  'thanks',
  'thank you.',
  'thanks.',
  'you',
  'you.',
  'bye',
  'bye.',
  'bye bye',
  'bye bye.',
  'please subscribe',
  'subtitles by the amara.org community',
]);

function isHallucination(text: string): boolean {
  const t = text.trim();
  if (t.length < 3) return true;
  if (HALLUCINATION_RE.test(t)) return true;
  if (HALLUCINATION_PHRASES.has(t.toLowerCase())) return true;
  return false;
}

export async function transcribeAudio(
  audioFileUri: string,
  onProgress?: (progress: number) => void
): Promise<TranscriptionResult> {
  const whisper = await getWhisperContext();

  // whisper.rn on Android uses JNI and requires a raw file path, not a
  // file:// URI. On iOS the framework handles URIs natively so no change needed.
  const filePath =
    Platform.OS === 'android' ? audioFileUri.replace(/^file:\/\//, '') : audioFileUri;

  const { stop, promise } = whisper.transcribe(filePath, {
    language: 'en',
    tokenTimestamps: false,
    // temperature: 0 → greedy decoding; more deterministic and less prone to
    // hallucination on noisy or short audio clips.
    temperature: 0,
    onProgress: onProgress
      ? (p: number) => onProgress(p / 100)
      : undefined,
  });

  const result = await promise;

  // Release immediately so iOS can reclaim the ~638 MB before the LLM loads.
  await releaseWhisperContext();

  const text = result.result.trim();

  return {
    text: isHallucination(text) ? '' : text,
    segments: result.segments,
  };
}
