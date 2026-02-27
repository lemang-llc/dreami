import { useCallback, useEffect, useRef } from 'react';
import { useDreamStore } from '../stores/dreamStore';
import {
  requestMicrophonePermission,
  startRecording,
  stopRecording,
  getMetering,
  isCurrentlyRecording,
} from '../audio/recorder';

const METERING_INTERVAL_MS = 100;

export function useRecorder() {
  const store = useDreamStore();
  const meteringRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMeteringPoll = useCallback(() => {
    meteringRef.current = setInterval(() => {
      const db = getMetering();
      // Normalize dBFS (-160 to 0) to a 0-1 amplitude value
      const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
      store.pushWaveformBar(normalized);
    }, METERING_INTERVAL_MS);
  }, [store]);

  const stopMeteringPoll = useCallback(() => {
    if (meteringRef.current) {
      clearInterval(meteringRef.current);
      meteringRef.current = null;
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    const granted = await requestMicrophonePermission();
    if (!granted) return false;

    store.clearWaveform();
    store.setRecordingState('recording');
    await startRecording();
    startMeteringPoll();
    return true;
  }, [store, startMeteringPoll]);

  const stop = useCallback(async (): Promise<string | null> => {
    stopMeteringPoll();
    try {
      const result = await stopRecording();
      store.setCurrentAudioUri(result.uri);
      return result.uri;
    } catch {
      store.setRecordingState('idle');
      return null;
    }
  }, [store, stopMeteringPoll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopMeteringPoll();
  }, [stopMeteringPoll]);

  return {
    isRecording: store.recordingState === 'recording',
    waveformBars: store.waveformBars,
    start,
    stop,
  };
}
