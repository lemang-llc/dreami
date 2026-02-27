import { create } from 'zustand';

export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'editing' | 'saving';

interface DreamStore {
  // Active recording / editing state
  recordingState: RecordingState;
  setRecordingState: (s: RecordingState) => void;

  // Current audio URI (set after recording stops)
  currentAudioUri: string | null;
  setCurrentAudioUri: (uri: string | null) => void;

  // Current transcript being edited
  currentTranscript: string;
  setCurrentTranscript: (t: string) => void;

  // Transcription progress [0, 1]
  transcriptionProgress: number;
  setTranscriptionProgress: (p: number) => void;

  // Waveform amplitude bars (recent metering values)
  waveformBars: number[];
  pushWaveformBar: (amplitude: number) => void;
  clearWaveform: () => void;

  reset: () => void;
}

export const useDreamStore = create<DreamStore>((set) => ({
  recordingState: 'idle',
  setRecordingState: (s) => set({ recordingState: s }),

  currentAudioUri: null,
  setCurrentAudioUri: (uri) => set({ currentAudioUri: uri }),

  currentTranscript: '',
  setCurrentTranscript: (t) => set({ currentTranscript: t }),

  transcriptionProgress: 0,
  setTranscriptionProgress: (p) => set({ transcriptionProgress: p }),

  waveformBars: [],
  pushWaveformBar: (amplitude) =>
    set((state) => ({
      waveformBars: [...state.waveformBars.slice(-40), amplitude],
    })),
  clearWaveform: () => set({ waveformBars: [] }),

  reset: () =>
    set({
      recordingState: 'idle',
      currentAudioUri: null,
      currentTranscript: '',
      transcriptionProgress: 0,
      waveformBars: [],
    }),
}));
