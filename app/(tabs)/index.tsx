import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useDreams } from '../../src/hooks/useDreams';
import { DreamCard } from '../../src/components/DreamCard';
import { Dream } from '../../src/db/schema';

export default function DreamListScreen() {
  const { dreams, isLoading, refetch } = useDreams();

  // Refresh list when screen is focused (e.g. after saving a new dream)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const renderItem = ({ item }: { item: Dream }) => (
    <DreamCard
      dream={item}
      onPress={() => router.push(`/dream/${item.id}`)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🌙</Text>
      <Text style={styles.emptyTitle}>No dreams yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap Record to capture your first dream
      </Text>
      <Pressable
        style={styles.recordBtn}
        onPress={() => router.push('/(tabs)/record')}
      >
        <Text style={styles.recordBtnText}>Record a Dream</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={dreams}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListEmptyComponent={isLoading ? null : renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#a78bfa"
          />
        }
        contentContainerStyle={
          dreams.length === 0 ? styles.emptyContainer : styles.listContent
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 56,
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
