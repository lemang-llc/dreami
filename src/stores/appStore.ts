import { create } from 'zustand';

export type ModelStatus = 'not_downloaded' | 'downloading' | 'downloaded' | 'loading' | 'ready' | 'error';

interface AppState {
  // Onboarding
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;

  // Model ready flags
  llmReady: boolean;
  embedReady: boolean;
  whisperReady: boolean;
  setLlmReady: (v: boolean) => void;
  setEmbedReady: (v: boolean) => void;
  setWhisperReady: (v: boolean) => void;

  // Download status per model
  llmStatus: ModelStatus;
  embedStatus: ModelStatus;
  whisperStatus: ModelStatus;
  setLlmStatus: (s: ModelStatus) => void;
  setEmbedStatus: (s: ModelStatus) => void;
  setWhisperStatus: (s: ModelStatus) => void;

  // Error state
  initError: string | null;
  setInitError: (e: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  onboardingComplete: false,
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),

  llmReady: false,
  embedReady: false,
  whisperReady: false,
  setLlmReady: (v) => set({ llmReady: v }),
  setEmbedReady: (v) => set({ embedReady: v }),
  setWhisperReady: (v) => set({ whisperReady: v }),

  llmStatus: 'not_downloaded',
  embedStatus: 'not_downloaded',
  whisperStatus: 'not_downloaded',
  setLlmStatus: (s) => set({ llmStatus: s }),
  setEmbedStatus: (s) => set({ embedStatus: s }),
  setWhisperStatus: (s) => set({ whisperStatus: s }),

  initError: null,
  setInitError: (e) => set({ initError: e }),
}));
