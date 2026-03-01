import * as Speech from 'expo-speech';

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
  await Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    pitch: 1.0,
    rate: 0.92, // slightly slower than default for easier comprehension
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export async function stopSpeaking(): Promise<void> {
  await Speech.stop();
}
