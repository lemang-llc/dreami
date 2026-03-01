import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { isLlmLoaded, isLlmLoading } from '../models/llmContext';
import { isWhisperLoaded } from '../models/whisperContext';

const MODEL_MB = {
  whisper: Platform.OS === 'ios' ? 638 : 488,
  llm: 800,
};

export interface DebugMemoryState {
  whisperLoaded: boolean;
  llmLoaded: boolean;
  llmLoading: boolean;
  estimatedMB: number;
  llmLoadingElapsedSec: number;
}

export function useDebugMemory(): DebugMemoryState {
  const [state, setState] = useState<DebugMemoryState>({
    whisperLoaded: false,
    llmLoaded: false,
    llmLoading: false,
    estimatedMB: 0,
    llmLoadingElapsedSec: 0,
  });

  const loadingStartRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      const whisperLoaded = isWhisperLoaded();
      const llmLoaded = isLlmLoaded();
      const llmLoading = isLlmLoading();

      if (llmLoading && loadingStartRef.current === null) {
        loadingStartRef.current = Date.now();
      } else if (!llmLoading) {
        loadingStartRef.current = null;
      }

      const llmLoadingElapsedSec =
        loadingStartRef.current !== null
          ? Math.floor((Date.now() - loadingStartRef.current) / 1000)
          : 0;

      const estimatedMB =
        (whisperLoaded ? MODEL_MB.whisper : 0) +
        (llmLoaded || llmLoading ? MODEL_MB.llm : 0);

      setState({ whisperLoaded, llmLoaded, llmLoading, estimatedMB, llmLoadingElapsedSec });
    };

    update();
    const interval = setInterval(update, 3000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
