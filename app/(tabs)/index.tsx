import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDreams } from '../../src/hooks/useDreams';
import { DreamCard } from '../../src/components/DreamCard';
import { Dream } from '../../src/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'all' | 'month' | 'week';

type TimelineSection = {
  date: string;    // YYYY-MM-DD local
  title: string;   // "Today", "Yesterday", "Monday, Mar 3", …
  data: Dream[];
  gapDays: number; // calendar days between this section and the one above it (newer)
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = ['vivid', 'anxious', 'peaceful', 'strange', 'dark', 'joyful', 'neutral'] as const;

const MOOD_COLORS: Record<string, string> = {
  vivid: '#a78bfa',
  anxious: '#f97316',
  peaceful: '#34d399',
  strange: '#60a5fa',
  dark: '#6b7280',
  joyful: '#fbbf24',
  neutral: '#9ca3af',
};

const PERIOD_LABELS: Record<Period, string> = {
  all: 'All time',
  month: 'Month',
  week: 'Week',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function localDateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSectionTitle(dateKey: string): string {
  const today = localDateKey(new Date());
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yesterday = localDateKey(yd);

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';

  const [y, mo, d] = dateKey.split('-').map(Number);
  const date = new Date(y, mo - 1, d, 12);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  });
}

function daysBetween(olderKey: string, newerKey: string): number {
  const [oy, om, od] = olderKey.split('-').map(Number);
  const [ny, nm, nd] = newerKey.split('-').map(Number);
  return Math.round(
    (new Date(ny, nm - 1, nd).getTime() - new Date(oy, om - 1, od).getTime()) /
      86_400_000,
  );
}

// ─── Section builder ──────────────────────────────────────────────────────────

function buildSections(dreams: Dream[]): TimelineSection[] {
  const grouped = new Map<string, Dream[]>();
  for (const d of dreams) {
    const key = localDateKey(d.createdAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }

  // Newest date first
  const keys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

  return keys.map((key, i) => ({
    date: key,
    title: formatSectionTitle(key),
    data: grouped.get(key)!,
    // Gap between this section and the one above it in the list (the newer one, i-1)
    gapDays: i === 0 ? 0 : daysBetween(key, keys[i - 1]),
  }));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DreamListScreen() {
  const { dreams, isLoading, refetch } = useDreams();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');

  useFocusEffect(
    useCallback(() => { refetch(); }, [refetch]),
  );

  const filtered = useMemo(() => {
    let d = dreams;

    if (selectedMood) {
      d = d.filter((x) => x.mood === selectedMood);
    }

    if (selectedPeriod === 'week') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      d = d.filter((x) => x.createdAt >= cutoff.toISOString());
    } else if (selectedPeriod === 'month') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 1);
      d = d.filter((x) => x.createdAt >= cutoff.toISOString());
    }

    return d;
  }, [dreams, selectedMood, selectedPeriod]);

  const sections = useMemo(() => buildSections(filtered), [filtered]);

  const isFiltered = selectedMood !== null || selectedPeriod !== 'all';

  // ── Section header ────────────────────────────────────────────────────────

  const renderSectionHeader = ({ section }: { section: TimelineSection }) => (
    <View>
      {section.gapDays > 1 && (
        <View style={styles.gapRow}>
          <View style={styles.gapLine} />
          <Text style={styles.gapLabel}>
            — {section.gapDays} day{section.gapDays !== 1 ? 's' : ''} —
          </Text>
          <View style={styles.gapLine} />
        </View>
      )}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>
          {section.data.length} {section.data.length === 1 ? 'dream' : 'dreams'}
        </Text>
      </View>
    </View>
  );

  // ── Empty state ───────────────────────────────────────────────────────────

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>{isFiltered ? '🔍' : '🌙'}</Text>
        <Text style={styles.emptyTitle}>
          {isFiltered ? 'No matching dreams' : 'No dreams yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isFiltered
            ? 'Try adjusting the filters above.'
            : 'Tap Record to capture your first dream.'}
        </Text>
        {!isFiltered && (
          <Pressable style={styles.recordBtn} onPress={() => router.push('/(tabs)/record')}>
            <Text style={styles.recordBtnText}>Record a Dream</Text>
          </Pressable>
        )}
      </View>
    );
  };

  // ── Filter bar ────────────────────────────────────────────────────────────

  const toggleMood = (mood: string) =>
    setSelectedMood((prev) => (prev === mood ? null : mood));

  return (
    <View style={styles.container}>
      {/* ── Filter bar (fixed, doesn't scroll away) ── */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodRow}
        >
          <Pressable
            style={[styles.chip, !selectedMood && styles.chipAllActive]}
            onPress={() => setSelectedMood(null)}
          >
            <Text style={[styles.chipText, !selectedMood && styles.chipTextActive]}>
              All moods
            </Text>
          </Pressable>

          {MOODS.map((mood) => {
            const active = selectedMood === mood;
            const color = MOOD_COLORS[mood];
            return (
              <Pressable
                key={mood}
                style={[
                  styles.chip,
                  active && { borderColor: color, backgroundColor: color + '28' },
                ]}
                onPress={() => toggleMood(mood)}
              >
                <View style={[styles.moodDot, { backgroundColor: color }]} />
                <Text style={[styles.chipText, active && { color }]}>{mood}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.periodRow}>
          {(['all', 'month', 'week'] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]}
              onPress={() => setSelectedPeriod(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === p && styles.periodTextActive,
                ]}
              >
                {PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Timeline list ── */}
      <SectionList<Dream, TimelineSection>
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DreamCard dream={item} onPress={() => router.push(`/dream/${item.id}`)} />
        )}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#a78bfa" />
        }
        contentContainerStyle={
          sections.length === 0 ? styles.emptyContainer : styles.listContent
        }
      />

      {isLoading && dreams.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#a78bfa" />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },

  // ── Filter bar ──
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
    paddingTop: 10,
    paddingBottom: 8,
  },
  moodRow: {
    paddingHorizontal: 12,
    gap: 6,
    paddingBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2d2d4e',
    backgroundColor: '#1a1a2e',
  },
  chipAllActive: {
    borderColor: '#6c63ff',
    backgroundColor: '#6c63ff28',
  },
  chipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#e2e8f0',
  },
  moodDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#1a1a2e',
  },
  periodText: {
    color: '#475569',
    fontSize: 12,
  },
  periodTextActive: {
    color: '#a78bfa',
    fontWeight: '600',
  },

  // ── Timeline ──
  listContent: {
    paddingTop: 4,
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: '#334155',
    fontSize: 11,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 2,
  },
  gapLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1a1a2e',
  },
  gapLabel: {
    color: '#334155',
    fontSize: 11,
    marginHorizontal: 10,
  },

  // ── Empty ──
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  recordBtn: {
    backgroundColor: '#6c63ff',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  recordBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
