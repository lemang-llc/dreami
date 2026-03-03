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
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from '../src/notifications/scheduler';
import { NotificationTimePicker } from '../src/components/NotificationTimePicker';
import { getModelsDirSize, getRecordingFiles, deleteFile, formatBytes } from '../src/utils/fileSystem';
import { MODEL_SIZES } from '../src/models/config';
import { StarField } from '../src/components/StarField';
import { DreAmI } from '../src/components/DreAmI';
import { COLORS, FONTS } from '../src/theme';

export default function SettingsScreen() {
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifHour, setNotifHour] = useState(8);
  const [notifMinute, setNotifMinute] = useState(0);
  const [modelsDirSize, setModelsDirSize] = useState(0);
  const [recordingsSize, setRecordingsSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(false);
    }
    load();
  }, []);

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
              <Text style={styles.rowSub}>
                Get reminded to record your dreams
              </Text>
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
            <Text style={styles.modelItem}>
              · LLM: {formatBytes(MODEL_SIZES.llm)} (Llama 3.2 1B)
            </Text>
            <Text style={styles.modelItem}>
              · Whisper: {formatBytes(MODEL_SIZES.whisper)}
            </Text>
            <Text style={styles.modelItem}>
              · Embeddings: {formatBytes(MODEL_SIZES.embedding)}
            </Text>
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
});
