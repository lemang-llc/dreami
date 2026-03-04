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
import { useLocalSearchParams, router, useNavigation, useFocusEffect } from 'expo-router';
import { getDatabase } from '../../src/db/client';
import { dreams, Dream } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { indexDream, embedDream } from '../../src/rag/pipeline';
import { processDream } from '../../src/llm/summarizer';
import { StarField } from '../../src/components/StarField';
import { COLORS, MOOD_COLORS, FONTS } from '../../src/theme';
import { getDreamSessions, SessionSummary } from '../../src/db/chatHistory';

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DreamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [dream, setDream] = useState<Dream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTranscript, setEditTranscript] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessProgress, setReprocessProgress] = useState(0);
  const [dreamSessions, setDreamSessions] = useState<SessionSummary[]>([]);
  const progressRef = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(tabs)');
  };

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const load = useCallback(async () => {
    if (!id) return;
    const db = getDatabase();
    const [row] = await db.select().from(dreams).where(eq(dreams.id, parseInt(id, 10)));
    if (row) { setDream(row); setEditTranscript(row.transcript); }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Refresh sessions whenever this screen gains focus (e.g. returning from chat)
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getDreamSessions(parseInt(id, 10))
        .then(setDreamSessions)
        .catch(() => {});
    }, [id]),
  );

  useEffect(() => {
    navigation.setOptions({
      title: dream?.title || 'Dream',
      headerRight: () =>
        isReprocessing ? (
          <Pressable onPress={goBack} style={{ marginRight: 16 }}>
            <Text style={{ color: COLORS.lavender, fontFamily: FONTS.bodyMed, fontSize: 16 }}>Done</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setIsEditing((v) => !v)} style={{ marginRight: 16 }}>
            <Text style={{ color: COLORS.lavender, fontFamily: FONTS.bodyMed, fontSize: 16 }}>
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
      await db.update(dreams)
        .set({ transcript: editTranscript.trim(), isProcessed: false, updatedAt: new Date().toISOString() })
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
          await getDatabase().delete(dreams).where(eq(dreams.id, dream.id));
          goBack();
        },
      },
    ]);
  };

  const handleReprocess = async () => {
    if (!dream || isReprocessing) return;
    setIsReprocessing(true);
    setReprocessProgress(0);
    progressRef.current = 0;

    progressTimerRef.current = setInterval(() => {
      setReprocessProgress(progressRef.current);
    }, 500);

    try {
      const db = getDatabase();
      await db.update(dreams)
        .set({ isProcessed: false, updatedAt: new Date().toISOString() })
        .where(eq(dreams.id, dream.id));
      if (isMountedRef.current) setDream((d) => d ? { ...d, isProcessed: false } : d);

      await indexDream(dream.id, dream.transcript);
      progressRef.current = 10;

      await processDream(dream.id, (p) => { progressRef.current = 10 + Math.round(p * 60); });
      progressRef.current = 70;

      await embedDream(dream.id, dream.transcript, (p) => { progressRef.current = 70 + Math.round(p * 30); });

      progressRef.current = 100;
      if (isMountedRef.current) { setReprocessProgress(100); await load(); }
    } catch {
      if (isMountedRef.current) Alert.alert('Processing Failed', 'Could not analyse this dream. Make sure the AI model is downloaded.');
    } finally {
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      if (isMountedRef.current) { setIsReprocessing(false); setReprocessProgress(0); }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <StarField />
        <ActivityIndicator color={COLORS.lavender} />
      </View>
    );
  }

  if (!dream) {
    return (
      <View style={styles.centered}>
        <StarField />
        <Text style={styles.notFound}>Dream not found.</Text>
      </View>
    );
  }

  const tags: string[] = (() => {
    try { return JSON.parse(dream.tags ?? '[]'); } catch { return []; }
  })();

  const dateStr = new Date(dream.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const moodColor = MOOD_COLORS[dream.mood ?? 'neutral'] ?? MOOD_COLORS.neutral;

  return (
    <View style={styles.root}>
      <StarField />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Date */}
        <Text style={styles.date}>{dateStr}</Text>

        {/* Mood + Tags */}
        {dream.mood && (
          <View style={styles.moodRow}>
            <View style={[styles.moodChip, { borderColor: moodColor + '88' }]}>
              <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
              <Text style={[styles.moodText, { color: moodColor }]}>{dream.mood}</Text>
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

        {/* Actions */}
        {isReprocessing ? (
          <View style={styles.processingBanner}>
            <ActivityIndicator color={COLORS.teal} size="small" />
            <View style={{ flex: 1 }}>
              <Text style={styles.processingText}>
                {`AI analysis… ${reprocessProgress}%`}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${reprocessProgress}%` }]} />
              </View>
            </View>
          </View>
        ) : (
          !isEditing && (
            <>
              <Pressable style={styles.reprocessBtn} onPress={handleReprocess}>
                <Text style={styles.reprocessBtnText}>
                  {dream.isProcessed ? '↺  Re-analyse with AI' : '✦  Analyse with AI'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.chatBtn}
                onPress={() => router.navigate({ pathname: '/(tabs)/chat', params: { dreamId: String(dream.id) } })}
              >
                <Text style={styles.chatBtnText}>💬  Chat about this dream</Text>
              </Pressable>
            </>
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
                placeholderTextColor={COLORS.textFaint}
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

        {/* Previous Chats */}
        {dreamSessions.length > 0 && !isEditing && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Previous Chats</Text>
            {dreamSessions.map((s) => (
              <Pressable
                key={s.id}
                style={styles.chatHistoryRow}
                onPress={() =>
                  router.navigate({
                    pathname: '/(tabs)/chat',
                    params: { sessionId: String(s.id) },
                  })
                }
              >
                <View style={styles.chatHistoryContent}>
                  <Text style={styles.chatHistoryDate}>{formatSessionDate(s.updatedAt)}</Text>
                  <Text style={styles.chatHistoryPreview} numberOfLines={1}>
                    {s.preview || 'Chat session'}
                  </Text>
                </View>
                <Text style={styles.chatHistoryArrow}>›</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Delete */}
        {!isEditing && (
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>Delete Dream</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────

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
  notFound: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 16,
  },
  date: {
    color: COLORS.textDim,
    fontFamily: FONTS.cinzelReg,
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  moodDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  moodText: {
    fontFamily: FONTS.bodyMed,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  tagChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: COLORS.lavenderMid,
    fontFamily: FONTS.cinzel,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    opacity: 0.85,
  },
  summary: {
    color: COLORS.textMid,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 23,
  },
  transcript: {
    color: COLORS.textBright,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 25,
  },
  transcriptInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    color: COLORS.textBright,
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editActions: {
    marginTop: 12,
  },
  saveBtn: {
    backgroundColor: COLORS.lavenderDeep,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontFamily: FONTS.bodySemi,
    fontSize: 15,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.teal + '44',
  },
  processingText: {
    color: COLORS.teal,
    fontFamily: FONTS.bodyMed,
    fontSize: 13,
    marginBottom: 6,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.teal,
    borderRadius: 2,
  },
  reprocessBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  reprocessBtnText: {
    color: COLORS.lavender,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },
  chatBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal + '55',
    marginBottom: 20,
  },
  chatBtnText: {
    color: COLORS.teal,
    fontFamily: FONTS.bodySemi,
    fontSize: 14,
  },

  // Previous Chats
  chatHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatHistoryContent: {
    flex: 1,
    gap: 3,
  },
  chatHistoryDate: {
    color: COLORS.textDim,
    fontFamily: FONTS.bodyMed,
    fontSize: 11,
  },
  chatHistoryPreview: {
    color: COLORS.textMid,
    fontFamily: FONTS.body,
    fontSize: 13,
  },
  chatHistoryArrow: {
    color: COLORS.textDim,
    fontSize: 20,
    marginLeft: 8,
  },

  deleteBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.rose + '44',
    marginTop: 8,
  },
  deleteBtnText: {
    color: COLORS.rose,
    fontFamily: FONTS.bodyMed,
    fontSize: 15,
  },
});
