import { useCallback } from 'react';
import { useDreamStore } from '../stores/dreamStore';
import { transcribeAudio } from '../audio/transcriber';

export function useTranscription() {
  const store = useDreamStore();

  const transcribe = useCallback(
    async (audioUri: string): Promise<string> => {
      store.setRecordingState('transcribing');
      store.setTranscriptionProgress(0);

      try {
        const result = await transcribeAudio(audioUri, (progress) => {
          store.setTranscriptionProgress(progress);
        });

        const text = result.text;
        store.setCurrentTranscript(text);
        store.setRecordingState('editing');
        return text;
      } catch (e) {
        store.setRecordingState('idle');
        throw e;
      }
    },
    [store]
  );

  return {
    transcribe,
    isTranscribing: store.recordingState === 'transcribing',
    progress: store.transcriptionProgress,
    transcript: store.currentTranscript,
    setTranscript: store.setCurrentTranscript,
  };
}
