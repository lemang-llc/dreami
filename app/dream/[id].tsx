import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { getDatabase } from '../../src/db/client';
import { dreams, Dream } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { indexDream, embedDream } from '../../src/rag/pipeline';
import { processDream } from '../../src/llm/summarizer';
import { useDebugMemory } from '../../src/hooks/useDebugMemory';

const MOOD_COLORS: Record<string, string> = {
  vivid: '#a78bfa',
  anxious: '#f97316',
  peaceful: '#34d399',
  strange: '#60a5fa',
  dark: '#6b7280',
  joyful: '#fbbf24',
  neutral: '#9ca3af',
};

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [dream, setDream] = useState<Dream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTranscript, setEditTranscript] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessProgress, setReprocessProgress] = useState(0); // 0–100
  const mem = useDebugMemory();
  // Track progress in a ref to avoid re-rendering on every LLM token.
  // Only flush to state at a throttled rate.
  const progressRef = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guard setState / Alert calls against the unmounted-component case
  // (user navigates back while analysis is still running).
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const load = useCallback(async () => {
    if (!id) return;
    const db = getDatabase();
    const [row] = await db
      .select()
      .from(dreams)
      .where(eq(dreams.id, parseInt(id, 10)));
    if (row) {
      setDream(row);
      setEditTranscript(row.transcript);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    navigation.setOptions({
      title: dream?.title || 'Dream Detail',
      headerRight: () =>
        isReprocessing ? (
          // During analysis: "Done" navigates back while processing continues
          // in the background. isMountedRef guards prevent stale setState calls.
          <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Text style={{ color: '#a78bfa', fontSize: 16 }}>Done</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setIsEditing((v) => !v)}
            style={{ marginRight: 16 }}
          >
            <Text style={{ color: '#a78bfa', fontSize: 16 }}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </Pressable>
        ),
    });
  }, [navigation, dream?.title, isEditing, isReprocessing]);

  const handleSave = async () => {
    if (!dream || !id) return;
    setIsSaving(true);

    try {
      const db = getDatabase();
      await db
        .update(dreams)
        .set({
          transcript: editTranscript.trim(),
          isProcessed: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(dreams.id, dream.id));

      setIsEditing(false);
      load();
    } catch {
      Alert.alert('Save Failed', 'Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Dream?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!dream) return;
          const db = getDatabase();
          await db.delete(dreams).where(eq(dreams.id, dream.id));
          router.back();
        },
      },
    ]);
  };

  const handleReprocess = async () => {
    if (!dream || isReprocessing) return;
    setIsReprocessing(true);
    setReprocessProgress(0);
    progressRef.current = 0;

    // Flush progress ref → state at most every 500ms to avoid
    // re-rendering on every LLM token (256 renders → OOM).
    progressTimerRef.current = setInterval(() => {
      setReprocessProgress(progressRef.current);
    }, 500);

    try {
      const db = getDatabase();
      await db.update(dreams)
        .set({ isProcessed: false, updatedAt: new Date().toISOString() })
        .where(eq(dreams.id, dream.id));
      if (isMountedRef.current) setDream((d) => d ? { ...d, isProcessed: false } : d);

      // Phase 1: FTS5 index (instant, no model loading)
      await indexDream(dream.id, dream.transcript);
      progressRef.current = 10;

      // Phase 2: LLM summarization (10 → 70%)
      await processDream(dream.id, (p) => {
        progressRef.current = 10 + Math.round(p * 60);
      });
      progressRef.current = 70;

      // Phase 3: Embedding index (70 → 100%) — crash-safe, one chunk at a time.
      // Silently skips if the embedding model is not downloaded.
      await embedDream(dream.id, dream.transcript, (p) => {
        progressRef.current = 70 + Math.round(p * 30);
      });

      progressRef.current = 100;
      if (isMountedRef.current) {
        setReprocessProgress(100);
        await load();
      }
    } catch {
      if (isMountedRef.current) {
        Alert.alert('Processing Failed', 'Could not analyse this dream. Make sure the AI model is downloaded.');
      }
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (isMountedRef.current) {
        setIsReprocessing(false);
        setReprocessProgress(0);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#a78bfa" />
      </View>
    );
  }

  if (!dream) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Dream not found.</Text>
      </View>
    );
  }

  const tags: string[] = (() => {
    try {
      return JSON.parse(dream.tags ?? '[]');
    } catch {
      return [];
    }
  })();

  const dateStr = new Date(dream.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const moodColor = MOOD_COLORS[dream.mood ?? 'neutral'] ?? MOOD_COLORS.neutral;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Memory debug panel */}
      <MemoryDebugPanel mem={mem} />

      {/* Header */}
      <Text style={styles.date}>{dateStr}</Text>

      {dream.mood && (
        <View style={styles.moodRow}>
          <View style={[styles.moodChip, { borderColor: moodColor }]}>
            <Text style={[styles.moodText, { color: moodColor }]}>
              {dream.mood}
            </Text>
          </View>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Summary */}
      {dream.summary && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Summary</Text>
          <Text style={styles.summary}>{dream.summary}</Text>
        </View>
      )}

      {isReprocessing ? (
        <View style={styles.processingBanner}>
          <ActivityIndicator color="#60a5fa" size="small" />
          <View style={{ flex: 1 }}>
            <Text style={styles.processingText}>
              {mem.llmLoading
                ? `Loading model… ${mem.llmLoadingElapsedSec}s`
                : `AI analysis… ${reprocessProgress}%`}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${reprocessProgress}%` }]} />
            </View>
          </View>
        </View>
      ) : (
        !isEditing && (
          <Pressable style={styles.reprocessBtn} onPress={handleReprocess}>
            <Text style={styles.reprocessBtnText}>
              {dream.isProcessed ? '↺  Re-analyse with AI' : '✦  Analyse with AI'}
            </Text>
          </Pressable>
        )
      )}

      {/* Transcript */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Transcript</Text>
        {isEditing ? (
          <>
            <TextInput
              style={styles.transcriptInput}
              value={editTranscript}
              onChangeText={setEditTranscript}
              multiline
              textAlignVertical="top"
              autoCorrect={false}
            />
            <View style={styles.editActions}>
              <Pressable
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.transcript}>{dream.transcript}</Text>
        )}
      </View>

      {/* Delete */}
      {!isEditing && (
        <Pressable style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Dream</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// Danger threshold: above this the app is at risk of OOM on iPhone 13
const MEM_DANGER_MB = 1400;
const MEM_WARN_MB = 900;
const MEM_SCALE_MAX_MB = 1600;

function MemoryDebugPanel({ mem }: { mem: ReturnType<typeof useDebugMemory> }) {
  const fillPct = Math.min(100, (mem.estimatedMB / MEM_SCALE_MAX_MB) * 100);
  const barColor = mem.estimatedMB >= MEM_DANGER_MB
    ? '#f87171'
    : mem.estimatedMB >= MEM_WARN_MB
    ? '#f97316'
    : '#34d399';

  const rows: { label: string; mb: number; loaded: boolean; loading?: boolean }[] = [
    { label: 'Whisper', mb: 638, loaded: mem.whisperLoaded },
    { label: 'LLM', mb: 800, loaded: mem.llmLoaded, loading: mem.llmLoading },
  ];

  return (
    <View style={debugStyles.panel}>
      <View style={debugStyles.header}>
        <Text style={debugStyles.title}>Memory (estimated)</Text>
        <Text style={[debugStyles.total, { color: barColor }]}>
          {mem.estimatedMB.toLocaleString()} MB
        </Text>
      </View>
      <View style={debugStyles.track}>
        <View style={[debugStyles.fill, { width: `${fillPct}%` as any, backgroundColor: barColor }]} />
      </View>
      {rows.map((row) => (
        <View key={row.label} style={debugStyles.row}>
          <View style={[debugStyles.dot, {
            backgroundColor: row.loading ? '#f97316' : row.loaded ? barColor : '#2d2d4e',
          }]} />
          <Text style={debugStyles.rowLabel}>{row.label}</Text>
          <Text style={debugStyles.rowMb}>{row.mb} MB</Text>
          <Text style={[debugStyles.rowStatus, { color: row.loading ? '#f97316' : row.loaded ? '#64748b' : '#2d2d4e' }]}>
            {row.loading
              ? `loading… ${mem.llmLoadingElapsedSec}s`
              : row.loaded ? 'loaded' : 'released'}
          </Text>
        </View>
      ))}
    </View>
  );
}

const debugStyles = StyleSheet.create({
  panel: {
    backgroundColor: '#0f0f1f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e1e3a',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  total: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    backgroundColor: '#1e1e3a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rowLabel: {
    color: '#64748b',
    fontSize: 12,
    width: 52,
  },
  rowMb: {
    color: '#475569',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    width: 52,
  },
  rowStatus: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});

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
  notFound: {
    color: '#64748b',
    fontSize: 16,
  },
  date: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 12,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  moodChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tagChip: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: '#64748b',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  summary: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
  },
  transcript: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 24,
  },
  transcriptInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  editActions: {
    marginTop: 12,
  },
  saveBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  processingText: {
    color: '#60a5fa',
    fontSize: 13,
    marginBottom: 6,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1e3a5f',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#60a5fa',
    borderRadius: 2,
  },
  reprocessBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d4e',
    marginBottom: 16,
  },
  reprocessBtnText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d1a1a',
    marginTop: 8,
  },
  deleteBtnText: {
    color: '#f87171',
    fontSize: 15,
  },
});
