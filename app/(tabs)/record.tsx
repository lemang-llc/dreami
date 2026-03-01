import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useRecorder } from '../../src/hooks/useRecorder';
import { useTranscription } from '../../src/hooks/useTranscription';
import { Waveform } from '../../src/components/Waveform';
import { TranscriptEditor } from '../../src/components/TranscriptEditor';
import { getDatabase } from '../../src/db/client';
import { dreams } from '../../src/db/schema';
import { useDreamStore } from '../../src/stores/dreamStore';

export default function RecordScreen() {
  const { isRecording, waveformBars, start, stop } = useRecorder();
  const { transcribe, isTranscribing, progress, transcript, setTranscript } =
    useTranscription();
  const store = useDreamStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleStartRecording = async () => {
    const granted = await start();
    if (!granted) {
      Alert.alert(
        'Microphone Access',
        'Please grant microphone permission to record dreams.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStopRecording = async () => {
    const audioUri = await stop();
    if (!audioUri) return;
    store.setRecordingState('transcribing');
    try {
      await transcribe(audioUri);
    } catch {
      Alert.alert('Transcription Failed', 'Could not transcribe the recording.');
      store.setRecordingState('idle');
    }
  };

  const handleSave = async () => {
    if (!transcript.trim()) {
      Alert.alert('Empty Transcript', 'Please record or type your dream first.');
      return;
    }

    setIsSaving(true);
    store.setRecordingState('saving');

    try {
      const db = getDatabase();
      const [inserted] = await db
        .insert(dreams)
        .values({
          transcript: transcript.trim(),
          audioPath: store.currentAudioUri,
          title: 'Dream Entry',
        })
        .returning({ id: dreams.id });

      const dreamId = inserted.id;

      // Push (not replace) so the tab stack stays in history and the
      // native back button is visible on the dream detail screen.
      router.push(`/dream/${dreamId}`);

      store.reset();
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save your dream. Please try again.');
      store.setRecordingState('editing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert('Discard Recording?', 'This will delete the current recording.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => store.reset(),
      },
    ]);
  };

  const recordingState = store.recordingState;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Idle or recording state */}
      {(recordingState === 'idle' || recordingState === 'recording') && (
        <View style={styles.recordSection}>
          <Text style={styles.prompt}>
            {recordingState === 'idle'
              ? 'Speak your dream...'
              : 'Recording...'}
          </Text>

          <View style={styles.waveformContainer}>
            {recordingState === 'recording' ? (
              <Waveform bars={waveformBars} />
            ) : (
              <View style={styles.waveformPlaceholder}>
                <Text style={styles.micIcon}>🎙</Text>
              </View>
            )}
          </View>

          <Pressable
            style={[
              styles.recordBtn,
              isRecording && styles.recordBtnActive,
            ]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
          >
            <Text style={styles.recordBtnText}>
              {isRecording ? '⏹ Stop' : '⏺ Record'}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Transcribing state */}
      {recordingState === 'transcribing' && (
        <View style={styles.transcribingSection}>
          <ActivityIndicator color="#a78bfa" size="large" />
          <Text style={styles.transcribingText}>Transcribing...</Text>
          <Text style={styles.transcribingProgress}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}

      {/* Editing state */}
      {(recordingState === 'editing' || recordingState === 'saving') && (
        <View style={styles.editSection}>
          <Text style={styles.editHint}>
            Review and edit your dream transcript, then save.
          </Text>

          <TranscriptEditor
            value={transcript}
            onChange={setTranscript}
          />

          <View style={styles.editActions}>
            <Pressable style={styles.discardBtn} onPress={handleDiscard}>
              <Text style={styles.discardBtnText}>Discard</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Dream</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  recordSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  prompt: {
    color: '#94a3b8',
    fontSize: 18,
    marginBottom: 32,
  },
  waveformContainer: {
    marginBottom: 48,
    height: 64,
    justifyContent: 'center',
  },
  waveformPlaceholder: {
    alignItems: 'center',
  },
  micIcon: {
    fontSize: 48,
    opacity: 0.3,
  },
  recordBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 50,
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#6c63ff',
  },
  recordBtnActive: {
    backgroundColor: '#2d1b4e',
    borderColor: '#f87171',
  },
  recordBtnText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  transcribingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 300,
  },
  transcribingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  transcribingProgress: {
    color: '#a78bfa',
    fontSize: 28,
    fontWeight: '700',
  },
  editSection: {
    flex: 1,
  },
  editHint: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  discardBtn: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  discardBtnText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#6c63ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
