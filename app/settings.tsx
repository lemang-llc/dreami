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

      // Calculate total recordings size
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
        <ActivityIndicator color="#a78bfa" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            trackColor={{ false: '#2d2d4e', true: '#6c63ff' }}
            thumbColor={notifEnabled ? '#ffffff' : '#64748b'}
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
            • LLM: {formatBytes(MODEL_SIZES.llm)} (Llama 3.2 1B)
          </Text>
          <Text style={styles.modelItem}>
            • Whisper: {formatBytes(MODEL_SIZES.whisper)}
          </Text>
          <Text style={styles.modelItem}>
            • Embeddings: {formatBytes(MODEL_SIZES.embedding)}
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
        <Text style={styles.aboutText}>
          Dream Diary v1.0{'\n'}
          All AI inference runs locally on your device.{'\n'}
          No data ever leaves your phone.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a1a',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  rowInfo: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  rowSub: {
    color: '#475569',
    fontSize: 12,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  storageLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  storageValue: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
  modelList: {
    marginTop: 12,
    gap: 4,
  },
  modelItem: {
    color: '#475569',
    fontSize: 12,
  },
  deleteBtn: {
    marginTop: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d1a1a',
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 14,
  },
  aboutText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
  },
});
