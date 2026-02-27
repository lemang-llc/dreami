import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Dream } from '../db/schema';

const MOOD_COLORS: Record<string, string> = {
  vivid: '#a78bfa',
  anxious: '#f97316',
  peaceful: '#34d399',
  strange: '#60a5fa',
  dark: '#6b7280',
  joyful: '#fbbf24',
  neutral: '#9ca3af',
};

interface DreamCardProps {
  dream: Dream;
  onPress: () => void;
}

export function DreamCard({ dream, onPress }: DreamCardProps) {
  const tags: string[] = (() => {
    try {
      return JSON.parse(dream.tags ?? '[]');
    } catch {
      return [];
    }
  })();

  const moodColor = MOOD_COLORS[dream.mood ?? 'neutral'] ?? MOOD_COLORS.neutral;

  const dateStr = new Date(dream.createdAt).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {dream.title || 'Untitled Dream'}
        </Text>
        <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
      </View>

      {dream.summary ? (
        <Text style={styles.summary} numberOfLines={2}>
          {dream.summary}
        </Text>
      ) : (
        <Text style={styles.transcript} numberOfLines={2}>
          {dream.transcript || 'No transcript yet...'}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.date}>{dateStr}</Text>
        <View style={styles.tags}>
          {tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {!dream.isProcessed && (
        <View style={styles.processingBadge}>
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summary: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  transcript: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    color: '#475569',
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    backgroundColor: '#2d2d4e',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    color: '#a78bfa',
    fontSize: 11,
  },
  processingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#1e3a5f',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  processingText: {
    color: '#60a5fa',
    fontSize: 10,
  },
});
