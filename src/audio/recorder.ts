import {
  AudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { RECORDINGS_DIR } from '../utils/fileSystem';

export type RecorderState = 'idle' | 'recording' | 'stopped';

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

let _recorder: AudioRecorder | null = null;
let _startTime: number = 0;

export async function requestMicrophonePermission(): Promise<boolean> {
  const { status } = await requestRecordingPermissionsAsync();
  return status === 'granted';
}

export async function startRecording(): Promise<void> {
  if (_recorder) {
    throw new Error('Already recording');
  }

  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });

  _recorder = new AudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });

  // prepareToRecordAsync is patched onto the prototype at runtime but not typed
  await (_recorder as any).prepareToRecordAsync();
  _recorder.record();
  _startTime = Date.now();
}

export async function stopRecording(): Promise<RecordingResult> {
  if (!_recorder) {
    throw new Error('Not recording');
  }

  await _recorder.stop();
  const uri = _recorder.uri;
  const durationMs = Date.now() - _startTime;

  _recorder = null;

  if (!uri) {
    throw new Error('No recording URI');
  }

  // Move file to our recordings directory with a timestamp name
  const ext = uri.endsWith('.m4a') ? '.m4a' : '.wav';
  const filename = `dream_${Date.now()}${ext}`;
  const destUri = RECORDINGS_DIR + filename;
  await FileSystem.moveAsync({ from: uri, to: destUri });

  await setAudioModeAsync({
    allowsRecording: false,
  });

  return { uri: destUri, durationMs };
}

export function isCurrentlyRecording(): boolean {
  return _recorder !== null;
}

export function getMetering(): number {
  if (!_recorder) return -160;
  const status = _recorder.getStatus();
  return status.metering ?? -160;
}
