import { getWhisperContext, releaseWhisperContext } from '../models/whisperContext';

export interface TranscriptionResult {
  text: string;
  segments?: Array<{ start: number; end: number; text: string }>;
}

export async function transcribeAudio(
  audioFileUri: string,
  onProgress?: (progress: number) => void
): Promise<TranscriptionResult> {
  const whisper = await getWhisperContext();

  const { stop, promise } = whisper.transcribe(audioFileUri, {
    language: 'en',
    tokenTimestamps: false,
    onProgress: onProgress
      ? (p: number) => onProgress(p / 100)
      : undefined,
  });

  const result = await promise;

  // Release immediately so iOS can reclaim the ~638 MB before the LLM loads.
  await releaseWhisperContext();

  return {
    text: result.result.trim(),
    segments: result.segments,
  };
}
