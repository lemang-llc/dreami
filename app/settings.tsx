import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from '../src/notifications/scheduler';
import { NotificationTimePicker } from '../src/components/NotificationTimePicker';
import { getModelsDirSize, getRecordingFiles, deleteFile, formatBytes } from '../src/utils/fileSystem';
import { MODEL_SIZES, SETTINGS_KEYS } from '../src/models/config';
import { StarField } from '../src/components/StarField';
import { DreAmI } from '../src/components/DreAmI';
import { LeMaNgLabs } from '../src/components/LeMaNgLabs';
import { COLORS, FONTS } from '../src/theme';
import { getSqliteDb } from '../src/db/client';
import { router } from 'expo-router';
import { setTtsVoice, setTtsRate } from '../src/audio/tts';
import type { Voice as SpeechVoice } from 'expo-speech';

const RATE_PRESETS = [
  { label: '0.6×', rate: 0.6 },
  { label: '0.75×', rate: 0.75 },
  { label: '0.9×', rate: 0.9 },
  { label: '1.0×', rate: 1.0 },
  { label: '1.15×', rate: 1.15 },
];
const DEFAULT_RATE = 0.9;

export default function SettingsScreen() {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifHour, setNotifHour] = useState(8);
  const [notifMinute, setNotifMinute] = useState(0);
  const [modelsDirSize, setModelsDirSize] = useState(0);
  const [recordingsSize, setRecordingsSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<SpeechVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [voiceRate, setVoiceRate] = useState(DEFAULT_RATE);

  useEffect(() => {
    async function load() {
      const settings = await loadNotificationSettings();
      setNotifEnabled(settings.enabled);
      setNotifHour(settings.hour);
      setNotifMinute(settings.minute);

      const [mSize, recordings] = await Promise.all([
        getModelsDirSize(),
        getRecordingFiles(),
      ]);
      setModelsDirSize(mSize);

      let rSize = 0;
      for (const f of recordings) {
        const { getFileSize } = await import('../src/utils/fileSystem');
        rSize += await getFileSize(f);
      }
      setRecordingsSize(rSize);

      // Load available TTS voices (English only, Enhanced before Default then name)
      const allVoices = await Speech.getAvailableVoicesAsync();
      const enVoices = allVoices
        .filter((v) => v.language.startsWith('en'))
        .sort((a, b) => {
          const qa = a.quality === 'Enhanced' ? 1 : 0;
          const qb = b.quality === 'Enhanced' ? 1 : 0;
          return qb - qa || a.name.localeCompare(b.name);
        });
      setVoices(enVoices);

      // Load saved voice preferences
      const sqlite = getSqliteDb();
      if (sqlite) {
        const voiceRow = await sqlite
          .getFirstAsync<{ value: string }>(
            'SELECT value FROM app_settings WHERE key = ?',
            [SETTINGS_KEYS.TTS_VOICE_ID],
          )
          .catch(() => null);
        setSelectedVoiceId(voiceRow?.value ?? null);

        const rateRow = await sqlite
          .getFirstAsync<{ value: string }>(
            'SELECT value FROM app_settings WHERE key = ?',
            [SETTINGS_KEYS.TTS_VOICE_RATE],
          )
          .catch(() => null);
        if (rateRow) setVoiceRate(parseFloat(rateRow.value));
      }

      setIsLoading(false);
    }
    load();
  }, []);

  const handleSelectVoice = async (voice: SpeechVoice) => {
    const newId = selectedVoiceId === voice.identifier ? null : voice.identifier;
    setSelectedVoiceId(newId);
    setTtsVoice(newId);

    const sqlite = getSqliteDb();
    if (sqlite) {
      if (newId) {
        await sqlite
          .runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
            SETTINGS_KEYS.TTS_VOICE_ID,
            newId,
          ])
          .catch(() => {});
      } else {
        await sqlite
          .runAsync('DELETE FROM app_settings WHERE key = ?', [SETTINGS_KEYS.TTS_VOICE_ID])
          .catch(() => {});
      }
    }

    if (newId) {
      Speech.stop();
      Speech.speak('Sweet dreams are made of this.', {
        voice: newId,
        language: voice.language,
        rate: voiceRate,
        pitch: 1.0,
      });
    }
  };

  const handleSelectRate = async (rate: number) => {
    setVoiceRate(rate);
    setTtsRate(rate);

    const sqlite = getSqliteDb();
    if (sqlite) {
      await sqlite
        .runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
          SETTINGS_KEYS.TTS_VOICE_RATE,
          String(rate),
        ])
        .catch(() => {});
    }

    Speech.stop();
    Speech.speak('Sweet dreams are made of this.', {
      voice: selectedVoiceId ?? undefined,
      language: 'en-US',
      rate,
      pitch: 1.0,
    });
  };

  const handleNotifToggle = async (enabled: boolean) => {
    setNotifEnabled(enabled);
    await saveNotificationSettings({ enabled, hour: notifHour, minute: notifMinute });
  };

  const handleTimeChange = async (hour: number, minute: number) => {
    setNotifHour(hour);
    setNotifMinute(minute);
    await saveNotificationSettings({ enabled: notifEnabled, hour, minute });
  };

  const handleDeleteRecordings = () => {
    Alert.alert(
      'Delete Audio Files',
      'This will delete all original audio recordings. Transcripts and AI analysis will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const recordings = await getRecordingFiles();
            await Promise.all(recordings.map(deleteFile));
            setRecordingsSize(0);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <StarField />
        <ActivityIndicator color={COLORS.lavender} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StarField />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Morning Reminder</Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Daily Reminder</Text>
              <Text style={styles.rowSub}>Get reminded to record your dreams</Text>
            </View>
            <Switch
              value={notifEnabled}
              onValueChange={handleNotifToggle}
              trackColor={{ false: COLORS.border, true: COLORS.lavenderDeep }}
              thumbColor={notifEnabled ? '#ffffff' : COLORS.textDim}
            />
          </View>

          {notifEnabled && (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Time</Text>
                <Text style={styles.rowSub}>When to send the reminder</Text>
              </View>
              <NotificationTimePicker
                hour={notifHour}
                minute={notifMinute}
                onConfirm={handleTimeChange}
              />
            </View>
          )}
        </View>

        {/* Voice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Voice</Text>

          {/* Speed presets */}
          <Text style={styles.speedLabel}>Speed</Text>
          <View style={styles.presetRow}>
            {RATE_PRESETS.map((p) => (
              <Pressable
                key={p.rate}
                style={[styles.presetBtn, voiceRate === p.rate && styles.presetBtnActive]}
                onPress={() => handleSelectRate(p.rate)}
              >
                <Text style={[styles.presetBtnText, voiceRate === p.rate && styles.presetBtnTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Voice list */}
          <Text style={styles.voiceHint}>
            Tap a voice to select it and hear a preview. Tap again to revert to the system default.
          </Text>
          {voices.length === 0 ? (
            <Text style={styles.voiceEmpty}>No voices found on this device.</Text>
          ) : (
            voices.map((v) => {
              const isSelected = selectedVoiceId === v.identifier;
              const isEnhanced = v.quality === 'Enhanced';
              return (
                <Pressable
                  key={v.identifier}
                  style={[styles.voiceRow, isSelected && styles.voiceRowSelected]}
                  onPress={() => handleSelectVoice(v)}
                >
                  <View style={styles.voiceInfo}>
                    <Text style={[styles.voiceName, isSelected && styles.voiceNameSelected]}>
                      {v.name}
                    </Text>
                    <Text style={styles.voiceMeta}>{v.language}</Text>
                  </View>
                  {isSelected && <Text style={styles.voiceCheck}>✓</Text>}
                  {isEnhanced && !isSelected && (
                    <View style={styles.enhancedBadge}>
                      <Text style={styles.enhancedBadgeText}>Enhanced</Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>

          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>AI Models</Text>
            <Text style={styles.storageValue}>{formatBytes(modelsDirSize)}</Text>
          </View>

          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Audio Recordings</Text>
            <Text style={styles.storageValue}>{formatBytes(recordingsSize)}</Text>
          </View>

          <View style={styles.modelList}>
            <Text style={styles.modelItem}>· LLM: {formatBytes(MODEL_SIZES.llm)} (Llama 3.2 1B)</Text>
            <Text style={styles.modelItem}>· Whisper: {formatBytes(MODEL_SIZES.whisper)}</Text>
            <Text style={styles.modelItem}>· Embeddings: {formatBytes(MODEL_SIZES.embedding)}</Text>
          </View>

          {recordingsSize > 0 && (
            <Pressable style={styles.deleteBtn} onPress={handleDeleteRecordings}>
              <Text style={styles.deleteBtnText}>Delete Audio Files</Text>
            </Pressable>
          )}
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutNameRow}>
              <DreAmI size={15} />
              <Text style={styles.aboutVersion}> v1.0</Text>
            </View>
            <Text style={styles.aboutText}>
              All AI inference runs locally on your device.{'\n'}
              No data ever leaves your phone.
            </Text>
          </View>

          <Pressable style={styles.licensesRow} onPress={() => router.push('/licenses')}>
            <Text style={styles.licensesLabel}>Open Source Licenses</Text>
            <Text style={styles.licensesChevron}>›</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <LeMaNgLabs size={13} />
          <Text style={styles.copyright}>© 2026 LeMaNg LLC. All rights reserved.</Text>
        </View>

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
    padding: 20,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: COLORS.lavenderMid,
    fontFamily: FONTS.cinzelReg,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowInfo: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    color: COLORS.textBright,
    fontFamily: FONTS.bodyMed,
    fontSize: 15,
    marginBottom: 2,
  },
  rowSub: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 12,
  },

  // Speed presets
  speedLabel: {
    color: COLORS.textMid,
    fontFamily: FONTS.bodyMed,
    fontSize: 13,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetBtnActive: {
    backgroundColor: COLORS.lavenderDeep,
    borderColor: COLORS.lavender,
  },
  presetBtnText: {
    color: COLORS.textDim,
    fontFamily: FONTS.bodyMed,
    fontSize: 12,
  },
  presetBtnTextActive: {
    color: '#fff',
  },

  // Voice selector
  voiceHint: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  voiceEmpty: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 13,
    paddingVertical: 12,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voiceRowSelected: {
    borderColor: COLORS.lavender + '88',
    backgroundColor: COLORS.lavenderDeep + '18',
  },
  voiceInfo: {
    flex: 1,
    gap: 2,
  },
  voiceName: {
    color: COLORS.textMid,
    fontFamily: FONTS.bodyMed,
    fontSize: 14,
  },
  voiceNameSelected: {
    color: COLORS.textBright,
  },
  voiceMeta: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  voiceCheck: {
    color: COLORS.lavender,
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    marginLeft: 8,
  },
  enhancedBadge: {
    backgroundColor: COLORS.lavenderDeep + '33',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.lavender + '44',
  },
  enhancedBadgeText: {
    color: COLORS.lavender,
    fontFamily: FONTS.bodySemi,
    fontSize: 10,
  },

  // Storage
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  storageLabel: {
    color: COLORS.textMid,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  storageValue: {
    color: COLORS.textBright,
    fontFamily: FONTS.bodyMed,
    fontSize: 14,
  },
  modelList: {
    marginTop: 12,
    gap: 4,
    paddingHorizontal: 2,
  },
  modelItem: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 12,
    lineHeight: 18,
  },
  deleteBtn: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.rose + '55',
  },
  deleteBtnText: {
    color: COLORS.rose,
    fontFamily: FONTS.bodyMed,
    fontSize: 14,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 16,
    opacity: 0.55,
  },
  copyright: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 11,
    letterSpacing: 0.3,
  },

  // About
  aboutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  aboutNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  aboutVersion: {
    color: COLORS.textMid,
    fontFamily: FONTS.bodyMed,
    fontSize: 14,
  },
  aboutText: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 13,
    lineHeight: 20,
  },
  licensesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  licensesLabel: {
    color: COLORS.textMid,
    fontFamily: FONTS.bodyMed,
    fontSize: 14,
  },
  licensesChevron: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 20,
    lineHeight: 22,
  },
});
