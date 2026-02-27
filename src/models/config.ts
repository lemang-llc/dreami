import { Platform } from 'react-native';
import { MODELS_DIR } from '../utils/fileSystem';

// HuggingFace direct download URLs (GGUF quantized models)
const HF_BASE = 'https://huggingface.co';

export const MODEL_URLS = {
  // iOS: Phi-3.5 Mini Instruct Q4_K_M (~2.39 GB)
  llm_ios:
    `${HF_BASE}/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf`,

  // Android: Gemma 2 2B IT Q4_K_M (~1.71 GB)
  llm_android:
    `${HF_BASE}/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf`,

  // Whisper small.en GGML (~488 MB)
  whisper:
    `${HF_BASE}/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin`,

  // Whisper Core ML encoder for iOS ANE (~150 MB, zip)
  whisper_coreml:
    `${HF_BASE}/ggerganov/whisper.cpp/resolve/main/ggml-small.en-encoder.mlmodelc.zip`,

  // Nomic embed text v1.5 Q8_0 (~146 MB)
  embedding:
    `${HF_BASE}/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q8_0.gguf`,
} as const;

export const MODEL_PATHS = {
  llm: MODELS_DIR + (Platform.OS === 'ios' ? 'phi-3.5-mini-q4km.gguf' : 'gemma-2-2b-q4km.gguf'),
  whisper: MODELS_DIR + 'ggml-small.en.bin',
  whisper_coreml: MODELS_DIR + 'ggml-small.en-encoder.mlmodelc',
  embedding: MODELS_DIR + 'nomic-embed-text-v1.5-q8.gguf',
} as const;

// Expected file sizes in bytes (used for download verification)
export const MODEL_SIZES = {
  llm: Platform.OS === 'ios' ? 2_390_000_000 : 1_710_000_000,
  whisper: 488_000_000,
  whisper_coreml: 150_000_000,
  embedding: 146_000_000,
} as const;

export type ModelKey = keyof typeof MODEL_PATHS;

// App settings keys
export const SETTINGS_KEYS = {
  NOTIFICATION_ENABLED: 'notification_enabled',
  NOTIFICATION_HOUR: 'notification_hour',
  NOTIFICATION_MINUTE: 'notification_minute',
  LLM_MODEL_DOWNLOADED: 'llm_model_downloaded',
  EMBED_MODEL_DOWNLOADED: 'embed_model_downloaded',
  WHISPER_MODEL_DOWNLOADED: 'whisper_model_downloaded',
  WHISPER_COREML_DOWNLOADED: 'whisper_coreml_downloaded',
  ONBOARDING_COMPLETE: 'onboarding_complete',
} as const;
