import React, { useState, useEffect } from 'react';
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
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useRecorder } from '../../src/hooks/useRecorder';
import { useTranscription } from '../../src/hooks/useTranscription';
import { Waveform } from '../../src/components/Waveform';
import { TranscriptEditor } from '../../src/components/TranscriptEditor';
import { StarField } from '../../src/components/StarField';
import { getDatabase } from '../../src/db/client';
import { dreams } from '../../src/db/schema';
import { useDreamStore } from '../../src/stores/dreamStore';
import { COLORS, FONTS } from '../../src/theme';
import { MicIcon, RecordDotIcon, StopIcon } from '../../src/components/Icons';

export default function RecordScreen() {
  const { isRecording, waveformBars, start, stop } = useRecorder();
  const { transcribe, isTranscribing, progress, transcript, setTranscript } = useTranscription();
  const store = useDreamStore();
  const [isSaving, setIsSaving] = useState(false);

  // Keep the screen on while recording so the mic isn't cut short.
  useEffect(() => {
    if (isRecording) {
      activateKeepAwakeAsync('recording');
    } else {
      deactivateKeepAwake('recording');
    }
    return () => deactivateKeepAwake('recording');
  }, [isRecording]);

  const handleStartRecording = async () => {
    const granted = await start();
    if (!granted) {
      Alert.alert('Microphone Access', 'Please grant microphone permission to record dreams.', [{ text: 'OK' }]);
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
        .values({ transcript: transcript.trim(), audioPath: store.currentAudioUri, title: 'Dream Entry' })
        .returning({ id: dreams.id });
      router.push(`/dream/${inserted.id}`);
      store.reset();
    } catch {
      Alert.alert('Save Failed', 'Could not save your dream. Please try again.');
      store.setRecordingState('editing');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert('Discard Recording?', 'This will delete the current recording.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => store.reset() },
    ]);
  };

  const recordingState = store.recordingState;

  return (
    <View style={styles.root}>
      <StarField />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Idle / Recording */}
        {(recordingState === 'idle' || recordingState === 'recording') && (
          <View style={styles.recordSection}>
            <Text style={styles.prompt}>
              {recordingState === 'idle' ? 'Speak your dream…' : 'Recording…'}
            </Text>

            <View style={styles.waveformContainer}>
              {recordingState === 'recording' ? (
                <Waveform bars={waveformBars} color={COLORS.lavender} />
              ) : (
                <View style={styles.waveformPlaceholder}>
                  <MicIcon color={COLORS.lavender} size={52} />
                </View>
              )}
            </View>

            <Pressable
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
            >
              {isRecording
                ? <StopIcon color="#fff" size={22} />
                : <RecordDotIcon color="#fff" size={22} />
              }
              <Text style={styles.recordBtnLabel}>
                {isRecording ? 'Stop' : 'Record'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Transcribing */}
        {recordingState === 'transcribing' && (
          <View style={styles.transcribingSection}>
            <ActivityIndicator color={COLORS.lavender} size="large" />
            <Text style={styles.transcribingText}>Transcribing…</Text>
            <Text style={styles.transcribingProgress}>{Math.round(progress * 100)}%</Text>
          </View>
        )}

        {/* Editing / Saving */}
        {(recordingState === 'editing' || recordingState === 'saving') && (
          <View style={styles.editSection}>
            <Text style={styles.editHint}>
              Review and edit your dream, then save.
            </Text>

            <TranscriptEditor value={transcript} onChange={setTranscript} />

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  recordSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 420,
    gap: 0,
  },
  prompt: {
    color: COLORS.textMid,
    fontFamily: FONTS.cinzelReg,
    fontSize: 18,
    letterSpacing: 0.5,
    marginBottom: 40,
  },
  waveformContainer: {
    marginBottom: 52,
    height: 64,
    justifyContent: 'center',
  },
  waveformPlaceholder: {
    alignItems: 'center',
  },
  recordBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 60,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.lavenderMid,
    gap: 4,
    // Glow
    shadowColor: COLORS.lavender,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  recordBtnActive: {
    borderColor: COLORS.rose,
    backgroundColor: COLORS.rose + '18',
    shadowColor: COLORS.rose,
  },
  recordBtnLabel: {
    color: COLORS.textMid,
    fontFamily: FONTS.bodyMed,
    fontSize: 13,
  },
  transcribingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    minHeight: 300,
  },
  transcribingText: {
    color: COLORS.textMid,
    fontFamily: FONTS.cinzelReg,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  transcribingProgress: {
    color: COLORS.lavender,
    fontFamily: FONTS.cinzel,
    fontSize: 36,
  },
  editSection: {
    flex: 1,
  },
  editHint: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 4,
    textAlign: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  discardBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  discardBtnText: {
    color: COLORS.textMid,
    fontFamily: FONTS.bodyMed,
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: COLORS.lavenderDeep,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.lavender,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  saveBtnDisabled: {
    opacity: 0.55,
  },
  saveBtnText: {
    color: '#ffffff',
    fontFamily: FONTS.bodySemi,
    fontSize: 15,
  },
});
