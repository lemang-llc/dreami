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
import { StarField } from '../../src/components/StarField';
import { DreAmI } from '../../src/components/DreAmI';
import { MODEL_SIZES, SETTINGS_KEYS } from '../../src/models/config';
import { getDatabase } from '../../src/db/client';
import { appSettings } from '../../src/db/schema';
import { useAppStore } from '../../src/stores/appStore';
import { ensureDirectoriesExist } from '../../src/utils/fileSystem';
import { COLORS, FONTS } from '../../src/theme';

export default function OnboardingScreen() {
  const { llm, embed, whisper, checkDownloaded, downloadAll, allDownloaded, resumeInterruptedDownloads } =
    useModelStatus();
  const { setOnboardingComplete } = useAppStore();
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function check() {
      await ensureDirectoriesExist();
      await resumeInterruptedDownloads();
      await checkDownloaded();
      setChecking(false);
    }
    check();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') checkDownloaded();
    });
    return () => sub.remove();
  }, [checkDownloaded, resumeInterruptedDownloads]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadAll();
    } catch {
      Alert.alert('Download Error', 'Some models failed to download. Please check your connection and try again.', [{ text: 'OK' }]);
    } finally {
      setDownloading(false);
    }
  };

  const handleContinue = async () => {
    const db = getDatabase();
    await db
      .insert(appSettings)
      .values({ key: SETTINGS_KEYS.ONBOARDING_COMPLETE, value: 'true' })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: 'true' } });
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  const totalSize = MODEL_SIZES.llm + MODEL_SIZES.embedding + MODEL_SIZES.whisper;
  const totalGB = (totalSize / 1e9).toFixed(1);

  return (
    <View style={styles.root}>
      <StarField />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.moonEmoji}>🌙</Text>
          <DreAmI size={42} style={styles.wordmark} />
          <Text style={styles.tagline}>
            Your fully private dream journal.{'\n'}
            Ancient craft meets on-device AI.
          </Text>
        </View>

        {/* Models section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Download AI Models</Text>
          <Text style={styles.sectionSub}>
            ~{totalGB} GB · Only needed once · Wi-Fi recommended
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

        {/* Actions */}
        <View style={styles.actions}>
          {!allDownloaded && !downloading && (
            <Pressable
              style={[styles.btn, checking && styles.btnDisabled]}
              onPress={handleDownload}
              disabled={downloading || checking}
            >
              <Text style={styles.btnText}>
                {checking ? 'Checking…' : 'Download Models'}
              </Text>
            </Pressable>
          )}

          {downloading && (
            <View style={styles.downloadingCard}>
              <Text style={styles.downloadingText}>
                Downloading… please keep the app open.
              </Text>
            </View>
          )}

          {allDownloaded && (
            <Pressable style={styles.btn} onPress={handleContinue}>
              <Text style={styles.btnText}>Begin dreaming  →</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.privacyNote}>
          Models live on your device and never leave it.{'\n'}
          No account · No cloud · No tracking.
        </Text>
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
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 72 : 48,
    paddingBottom: 48,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 44,
  },
  moonEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  wordmark: {
    marginBottom: 14,
  },
  tagline: {
    color: COLORS.textMid,
    fontFamily: FONTS.body,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: COLORS.textBright,
    fontFamily: FONTS.cinzel,
    fontSize: 16,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  sectionSub: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 13,
    marginBottom: 16,
  },
  actions: {
    marginBottom: 32,
  },
  btn: {
    backgroundColor: COLORS.lavenderDeep,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.lavender,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#ffffff',
    fontFamily: FONTS.bodySemi,
    fontSize: 16,
  },
  downloadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  downloadingText: {
    color: COLORS.teal,
    fontFamily: FONTS.bodyMed,
    fontSize: 14,
  },
  privacyNote: {
    color: COLORS.textFaint,
    fontFamily: FONTS.body,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
