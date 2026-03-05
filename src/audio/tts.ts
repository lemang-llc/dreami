import * as Speech from 'expo-speech';
import { getSqliteDb } from '../db/client';
import { SETTINGS_KEYS } from '../models/config';

const DEFAULT_RATE = 0.9;

// Cached voice ID and rate loaded lazily from DB on first speak.
let _voiceId: string | null = null;
let _voiceRate: number = DEFAULT_RATE;
let _prefsLoaded = false;

async function loadPrefs(): Promise<void> {
  if (_prefsLoaded) return;
  try {
    const sqlite = getSqliteDb();
    if (sqlite) {
      const voiceRow = await sqlite.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        [SETTINGS_KEYS.TTS_VOICE_ID],
      );
      _voiceId = voiceRow?.value ?? null;

      const rateRow = await sqlite.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        [SETTINGS_KEYS.TTS_VOICE_RATE],
      );
      _voiceRate = rateRow ? parseFloat(rateRow.value) : DEFAULT_RATE;
    }
  } catch {}
  _prefsLoaded = true;
}

/** Call after the user picks a voice in settings so it takes effect immediately. */
export function setTtsVoice(id: string | null): void {
  _voiceId = id;
  _prefsLoaded = true;
}

/** Call after the user adjusts the speed slider so it takes effect immediately. */
export function setTtsRate(rate: number): void {
  _voiceRate = rate;
  _prefsLoaded = true;
}

/**
 * Speak text using the platform TTS engine (iOS AVSpeechSynthesizer /
 * Android TextToSpeech). Stops any currently-playing speech first.
 *
 * @param onDone  Called when speech finishes naturally, is stopped, or errors.
 */
export async function speakText(
  text: string,
  onDone?: () => void,
): Promise<void> {
  await loadPrefs();
  await Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    pitch: 1.0,
    rate: _voiceRate,
    voice: _voiceId ?? undefined,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export async function stopSpeaking(): Promise<void> {
  await Speech.stop();
}
