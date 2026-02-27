import React, { useEffect, useState, useCallback } from 'react';
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
import { indexDream } from '../../src/rag/pipeline';
import { processDream } from '../../src/llm/summarizer';

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
      headerRight: () => (
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
  }, [navigation, dream?.title, isEditing]);

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

      // Re-process with updated transcript in background
      Promise.all([
        indexDream(dream.id, editTranscript.trim()),
        processDream(dream.id),
      ])
        .then(() => load())
        .catch(console.error);

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

      {!dream.isProcessed && (
        <View style={styles.processingBanner}>
          <ActivityIndicator color="#60a5fa" size="small" />
          <Text style={styles.processingText}>
            AI analysis in progress...
          </Text>
        </View>
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
