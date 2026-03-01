import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  AppState,
} from 'react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { useModelStatus } from '../../src/hooks/useModelStatus';
import { ModelDownloadCard } from '../../src/components/ModelDownloadCard';
import { MODEL_SIZES, SETTINGS_KEYS } from '../../src/models/config';
import { getDatabase } from '../../src/db/client';
import { appSettings } from '../../src/db/schema';
import { useAppStore } from '../../src/stores/appStore';
import { ensureDirectoriesExist } from '../../src/utils/fileSystem';

export default function OnboardingScreen() {
  const { llm, embed, whisper, checkDownloaded, downloadAll, allDownloaded, resumeInterruptedDownloads } =
    useModelStatus();
  const { setOnboardingComplete } = useAppStore();
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function check() {
      await ensureDirectoriesExist();
      // Resume any downloads that were interrupted by an app kill.
      await resumeInterruptedDownloads();
      // Refresh the downloaded/pending status for models that aren't resuming.
      await checkDownloaded();
      setChecking(false);
    }
    check();

    // When the app returns to the foreground (e.g. after screen lock), re-check
    // whether any background downloads finished while the screen was off.
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') checkDownloaded();
    });
    return () => sub.remove();
  }, [checkDownloaded, resumeInterruptedDownloads]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadAll();
    } catch (e) {
      Alert.alert(
        'Download Error',
        'Some models failed to download. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleContinue = async () => {
    const db = getDatabase();
    await db
      .insert(appSettings)
      .values({ key: SETTINGS_KEYS.ONBOARDING_COMPLETE, value: 'true' })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: 'true' },
      });

    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  const totalSize =
    MODEL_SIZES.llm + MODEL_SIZES.embedding + MODEL_SIZES.whisper;
  const totalGB = (totalSize / 1e9).toFixed(1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <Text style={styles.emoji}>🌙</Text>
        <Text style={styles.title}>Dream Diary</Text>
        <Text style={styles.subtitle}>
          Your fully private dream journal.{'\n'}
          All AI runs locally on your device.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Download AI Models</Text>
        <Text style={styles.sectionSubtitle}>
          ~{totalGB} GB • Only needed once • Requires Wi-Fi
        </Text>

        <ModelDownloadCard
          name="Llama 3.2 1B"
          description="Dream analysis & chat"
          sizeBytes={MODEL_SIZES.llm}
          status={llm}
        />
        <ModelDownloadCard
          name="Whisper Small"
          description="Voice transcription"
          sizeBytes={MODEL_SIZES.whisper}
          status={whisper}
        />
        <ModelDownloadCard
          name="Nomic Embed"
          description="Semantic memory search"
          sizeBytes={MODEL_SIZES.embedding}
          status={embed}
        />
      </View>

      <View style={styles.actions}>
        {!allDownloaded && !downloading && (
          <Pressable
            style={[styles.btn, styles.primaryBtn]}
            onPress={handleDownload}
            disabled={downloading || checking}
          >
            <Text style={styles.primaryBtnText}>
              {checking ? 'Checking...' : 'Download Models'}
            </Text>
          </Pressable>
        )}

        {downloading && (
          <View style={styles.downloadingIndicator}>
            <Text style={styles.downloadingText}>Downloading... please keep the app open.</Text>
          </View>
        )}

        {allDownloaded && (
          <Pressable style={[styles.btn, styles.primaryBtn]} onPress={handleContinue}>
            <Text style={styles.primaryBtnText}>Get Started →</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.privacyNote}>
        Models are stored on your device and never leave it.{'\n'}
        No account, no cloud, no tracking.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 16,
  },
  actions: {
    marginBottom: 32,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#6c63ff',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  downloadingIndicator: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  downloadingText: {
    color: '#60a5fa',
    fontSize: 14,
  },
  privacyNote: {
    color: '#334155',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
