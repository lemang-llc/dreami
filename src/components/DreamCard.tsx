import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Dream } from '../db/schema';
import { COLORS, MOOD_COLORS, FONTS } from '../theme';

interface DreamCardProps {
  dream: Dream;
  onPress: () => void;
}

export function DreamCard({ dream, onPress }: DreamCardProps) {
  const tags: string[] = (() => {
    try { return JSON.parse(dream.tags ?? '[]'); } catch { return []; }
  })();

  const moodColor = MOOD_COLORS[dream.mood ?? 'neutral'] ?? MOOD_COLORS.neutral;

  const _date = new Date(dream.createdAt);
  const dateStr = _date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = _date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {/* Mood accent line on the left edge */}
      <View style={[styles.accentLine, { backgroundColor: moodColor }]} />

      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {dream.title || 'Untitled Dream'}
          </Text>
          {dream.mood && (
            <Text style={[styles.moodLabel, { color: moodColor }]}>{dream.mood}</Text>
          )}
        </View>

        {dream.summary ? (
          <Text style={styles.summary} numberOfLines={2}>{dream.summary}</Text>
        ) : (
          <Text style={styles.transcript} numberOfLines={2}>
            {dream.transcript || 'No transcript yet…'}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.date}>{timeStr} · {dateStr}</Text>
          <View style={styles.tags}>
            {tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {!dream.isProcessed && (
        <View style={styles.processingBadge}>
          <Text style={styles.processingText}>processing</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  accentLine: {
    width: 3,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  body: {
    flex: 1,
    padding: 14,
    paddingLeft: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    color: COLORS.textBright,
    fontSize: 15,
    fontFamily: FONTS.bodySemi,
    flex: 1,
    marginRight: 8,
  },
  moodLabel: {
    fontSize: 11,
    fontFamily: FONTS.bodyMed,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  summary: {
    color: COLORS.textMid,
    fontSize: 13,
    fontFamily: FONTS.body,
    lineHeight: 19,
    marginBottom: 10,
  },
  transcript: {
    color: COLORS.textDim,
    fontSize: 13,
    fontFamily: FONTS.body,
    lineHeight: 18,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    color: COLORS.textDim,
    fontSize: 11,
    fontFamily: FONTS.body,
  },
  tags: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.lavenderMid,
    fontSize: 10,
    fontFamily: FONTS.bodyMed,
  },
  processingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  processingText: {
    color: COLORS.teal,
    fontSize: 10,
    fontFamily: FONTS.bodyMed,
  },
});
