import {
  AudioModule,
  IOSOutputFormat,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';

// AudioRecorder is not exported directly; it lives on the native AudioModule
const AudioRecorder = AudioModule.AudioRecorder;

// whisper.rn requires 16kHz mono PCM — record in that format directly
// to avoid lossy format conversion at transcription time.
const WHISPER_RECORDING_OPTIONS = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    linearPCMBitDepth: 16 as const,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    outputFormat: 'wav' as any,
    audioEncoder: 'pcm_16bit' as any,
  },
};
import * as FileSystem from 'expo-file-system/legacy';
import { RECORDINGS_DIR } from '../utils/fileSystem';

export type RecorderState = 'idle' | 'recording' | 'stopped';

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

let _recorder: InstanceType<typeof AudioRecorder> | null = null;
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
    ...WHISPER_RECORDING_OPTIONS,
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
