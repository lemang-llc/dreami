import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDreams } from '../../src/hooks/useDreams';
import { DreamCard } from '../../src/components/DreamCard';
import { StarField } from '../../src/components/StarField';
import { Dream } from '../../src/db/schema';
import { COLORS, MOOD_COLORS, FONTS } from '../../src/theme';
import { ftsSearch } from '../../src/rag/pipeline';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'all' | 'month' | 'week';

type TimelineSection = {
  date: string;
  title: string;
  data: Dream[];
  gapDays: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = ['vivid', 'anxious', 'peaceful', 'strange', 'dark', 'joyful', 'neutral'] as const;

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
    (new Date(ny, nm - 1, nd).getTime() - new Date(oy, om - 1, od).getTime()) / 86_400_000,
  );
}

function buildSections(dreams: Dream[]): TimelineSection[] {
  const grouped = new Map<string, Dream[]>();
  for (const d of dreams) {
    const key = localDateKey(d.createdAt);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }
  const keys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));
  return keys.map((key, i) => ({
    date: key,
    title: formatSectionTitle(key),
    data: grouped.get(key)!,
    gapDays: i === 0 ? 0 : daysBetween(key, keys[i - 1]),
  }));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DreamListScreen() {
  const { dreams, isLoading, refetch } = useDreams();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Dream[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearchMode = searchQuery.trim().length > 0;

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // Debounced search: runs FTS + semantic in parallel, merges by dreamId.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const chunks = await ftsSearch(q, 20);
        const matched = chunks
          .map(({ dreamId }) => dreams.find((d) => d.id === dreamId))
          .filter(Boolean) as Dream[];

        setSearchResults(matched);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, dreams]);

  const filtered = useMemo(() => {
    let d = dreams;
    if (selectedMood) d = d.filter((x) => x.mood === selectedMood);
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

  const renderSectionHeader = ({ section }: { section: TimelineSection }) => (
    <View>
      {section.gapDays > 1 && (
        <View style={styles.gapRow}>
          <View style={styles.gapLine} />
          <Text style={styles.gapLabel}>
            {section.gapDays} day{section.gapDays !== 1 ? 's' : ''} apart
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

  const toggleMood = (mood: string) =>
    setSelectedMood((prev) => (prev === mood ? null : mood));

  return (
    <View style={styles.container}>
      <StarField />

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search dreams…"
          placeholderTextColor={COLORS.textFaint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="never"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={12}>
            <Text style={styles.searchClear}>✕</Text>
          </Pressable>
        )}
        {isSearching && <ActivityIndicator color={COLORS.lavender} size="small" style={{ marginLeft: 4 }} />}
      </View>

      {/* Filter bar — hidden while searching */}
      {!isSearchMode && <View style={styles.filterBar}>
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
                  active && { borderColor: color, backgroundColor: color + '22' },
                ]}
                onPress={() => toggleMood(mood)}
              >
                <View style={[styles.moodDot, { backgroundColor: color }]} />
                <Text style={[styles.chipText, active && { color, fontFamily: FONTS.bodyMed }]}>
                  {mood}
                </Text>
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
              <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>}

      {/* Search results */}
      {isSearchMode ? (
        <FlatList<Dream>
          data={searchResults}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <DreamCard dream={item} onPress={() => router.push(`/dream/${item.id}`)} />
          )}
          style={{ backgroundColor: 'transparent' }}
          contentContainerStyle={searchResults.length === 0 ? styles.emptyContainer : styles.listContent}
          ListHeaderComponent={
            !isSearching && searchResults.length > 0 ? (
              <Text style={styles.searchResultsHeader}>
                {searchResults.length} {searchResults.length === 1 ? 'dream' : 'dreams'} found
              </Text>
            ) : null
          }
          ListEmptyComponent={
            isSearching ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No dreams found</Text>
                <Text style={styles.emptySubtitle}>Try different keywords or concepts.</Text>
              </View>
            )
          }
        />
      ) : (
        /* Timeline list */
        <SectionList<Dream, TimelineSection>
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <DreamCard dream={item} onPress={() => router.push(`/dream/${item.id}`)} />
          )}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={renderEmpty}
          stickySectionHeadersEnabled={false}
          style={{ backgroundColor: 'transparent' }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.lavender} />
          }
          contentContainerStyle={
            sections.length === 0 ? styles.emptyContainer : styles.listContent
          }
        />
      )}

      {isLoading && dreams.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.lavender} />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textBright,
    fontFamily: FONTS.body,
    fontSize: 14,
    padding: 0,
  },
  searchClear: {
    color: COLORS.textFaint,
    fontSize: 13,
    paddingHorizontal: 2,
  },
  searchResultsHeader: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },

  // Filter bar
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  moodRow: {
    paddingHorizontal: 14,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipAllActive: {
    borderColor: COLORS.lavenderMid,
    backgroundColor: COLORS.lavenderMid + '22',
  },
  chipText: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  chipTextActive: {
    color: COLORS.textBright,
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: COLORS.surface,
  },
  periodText: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 12,
  },
  periodTextActive: {
    color: COLORS.lavender,
    fontFamily: FONTS.bodyMed,
  },

  // Timeline
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
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 6,
  },
  sectionTitle: {
    color: COLORS.lavender,
    fontFamily: FONTS.cinzel,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  sectionCount: {
    color: COLORS.textFaint,
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  gapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 14,
    marginBottom: 2,
  },
  gapLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  gapLabel: {
    color: COLORS.textFaint,
    fontFamily: FONTS.body,
    fontSize: 11,
    marginHorizontal: 10,
  },

  // Empty state
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 18,
  },
  emptyTitle: {
    color: COLORS.textBright,
    fontFamily: FONTS.cinzel,
    fontSize: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    color: COLORS.textDim,
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  recordBtn: {
    backgroundColor: COLORS.lavenderDeep,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: COLORS.lavender,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  recordBtnText: {
    color: '#ffffff',
    fontFamily: FONTS.bodySemi,
    fontSize: 15,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
