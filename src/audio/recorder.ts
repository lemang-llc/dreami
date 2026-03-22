import { Platform } from 'react-native';
import {
  AudioModule,
  IOSOutputFormat,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import AudioRecord from 'react-native-audio-record';
import * as FileSystem from 'expo-file-system/legacy';
import { RECORDINGS_DIR } from '../utils/fileSystem';

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

export type RecorderState = 'idle' | 'recording' | 'stopped';

export interface RecordingResult {
  uri: string;
  durationMs: number;
}

// ─── iOS state ────────────────────────────────────────────────────────────────

let _recorder: InstanceType<typeof AudioRecorder> | null = null;
let _startTime: number = 0;

// ─── Android state ────────────────────────────────────────────────────────────

let _androidRecording = false;
let _androidMeteringDb = -160;
let _androidStartTime = 0;

// ─── Shared ───────────────────────────────────────────────────────────────────

export async function requestMicrophonePermission(): Promise<boolean> {
  const { status } = await requestRecordingPermissionsAsync();
  return status === 'granted';
}

export async function startRecording(): Promise<void> {
  if (Platform.OS === 'android') return startRecordingAndroid();

  // ── iOS (unchanged) ──────────────────────────────────────────────────────────
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
  if (Platform.OS === 'android') return stopRecordingAndroid();

  // ── iOS (unchanged) ──────────────────────────────────────────────────────────
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
  if (Platform.OS === 'android') return _androidRecording;
  return _recorder !== null;
}

export function getMetering(): number {
  if (Platform.OS === 'android') return _androidMeteringDb;
  if (!_recorder) return -160;
  const status = _recorder.getStatus();
  return status.metering ?? -160;
}

// ─── Android implementation ───────────────────────────────────────────────────
//
// expo-audio's MediaRecorder cannot produce PCM WAV on Android — it falls
// through to AAC/MPEG-4 regardless of the format options. whisper.rn's Android
// audio reader (AudioUtils.decodeWaveFile) is a raw PCM WAV reader that uses
// dr_wav.h and has no AAC/M4A decoder. The result was garbage → Whisper outputs
// [BLANK_AUDIO] → hallucination filter → empty transcript.
//
// react-native-audio-record uses Android's AudioRecord API directly, which
// captures raw 16-bit PCM and writes a proper WAV header. This produces exactly
// the format whisper.rn expects.

async function startRecordingAndroid(): Promise<void> {
  if (_androidRecording) throw new Error('Already recording');

  AudioRecord.init({
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16,
    audioSource: 6, // VOICE_RECOGNITION — tuned for speech, enables AGC/noise suppression
    wavFile: 'dream_temp.wav',
  });

  // Set the flag before start() so the data callback guard works immediately.
  _androidRecording = true;
  _androidMeteringDb = -160;
  _androidStartTime = Date.now();

  // Compute RMS amplitude from raw PCM chunks for waveform visualization.
  AudioRecord.on('data', (data: string) => {
    if (!_androidRecording) return;
    try {
      const binary = atob(data);
      let sumSq = 0;
      const numSamples = Math.floor(binary.length / 2);
      if (numSamples === 0) return;
      for (let i = 0; i < binary.length - 1; i += 2) {
        // 16-bit little-endian sample
        const unsigned = (binary.charCodeAt(i + 1) << 8) | binary.charCodeAt(i);
        const signed = unsigned > 32767 ? unsigned - 65536 : unsigned;
        sumSq += signed * signed;
      }
      const rms = Math.sqrt(sumSq / numSamples);
      _androidMeteringDb = rms > 1 ? 20 * Math.log10(rms / 32768) : -160;
    } catch {
      // ignore decode errors
    }
  });

  AudioRecord.start();
}

async function stopRecordingAndroid(): Promise<RecordingResult> {
  if (!_androidRecording) throw new Error('Not recording');

  // Clear the flag first so the data callback ignores any trailing chunks.
  _androidRecording = false;

  const audioFile = await AudioRecord.stop();
  const durationMs = Date.now() - _androidStartTime;
  _androidMeteringDb = -160;

  // audioFile is a raw absolute path from Context.getFilesDir() — e.g.
  // /data/user/0/{package}/files/dream_temp.wav
  // expo-file-system's moveAsync needs a file:// URI for both ends.
  const sourceUri = audioFile.startsWith('file://') ? audioFile : `file://${audioFile}`;
  const filename = `dream_${Date.now()}.wav`;
  const destUri = RECORDINGS_DIR + filename;
  await FileSystem.moveAsync({ from: sourceUri, to: destUri });

  // Return a raw path (no file:// prefix). whisper.rn on Android passes this
  // to new File(path), which does not accept file:// URIs.
  return { uri: destUri.replace(/^file:\/\//, ''), durationMs };
}
