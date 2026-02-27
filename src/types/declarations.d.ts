// whisper.rn lacks a root "." entry in its package.json `exports` field,
// so moduleResolution: bundler can't auto-resolve it. Declare the API we use.
declare module 'whisper.rn' {
  export interface TranscribeOptions {
    language?: string;
    maxLen?: number;
    tokenTimestamps?: boolean;
    onProgress?: (progress: number) => void;
  }

  export interface TranscribeSegment {
    start: number;
    end: number;
    text: string;
  }

  export interface TranscribeResult {
    result: string;
    segments: TranscribeSegment[];
  }

  export interface WhisperContext {
    transcribe(
      filePath: string,
      options?: TranscribeOptions
    ): { stop: () => void; promise: Promise<TranscribeResult> };
    release(): Promise<void>;
  }

  export interface InitWhisperOptions {
    filePath: string;
    isBundleAsset?: boolean;
  }

  export function initWhisper(options: InitWhisperOptions): Promise<WhisperContext>;
}
