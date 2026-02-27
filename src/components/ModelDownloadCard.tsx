import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ModelDownloadStatus } from '../hooks/useModelStatus';
import { formatBytes } from '../utils/fileSystem';

interface ModelDownloadCardProps {
  name: string;
  description: string;
  sizeBytes: number;
  status: ModelDownloadStatus;
}

export function ModelDownloadCard({
  name,
  description,
  sizeBytes,
  status,
}: ModelDownloadCardProps) {
  const getStatusText = () => {
    if (status.downloaded) return 'Ready';
    if (status.downloading)
      return `${Math.round(status.progress * 100)}%`;
    if (status.error) return 'Error';
    return 'Pending';
  };

  const getStatusColor = () => {
    if (status.downloaded) return '#34d399';
    if (status.downloading) return '#60a5fa';
    if (status.error) return '#f87171';
    return '#64748b';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.statusBlock}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          <Text style={styles.sizeText}>{formatBytes(sizeBytes)}</Text>
        </View>
      </View>

      {status.downloading && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(status.progress * 100)}%` },
            ]}
          />
        </View>
      )}

      {status.downloaded && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%', backgroundColor: '#34d399' }]} />
        </View>
      )}

      {status.error && (
        <Text style={styles.errorText}>{status.error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameBlock: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    color: '#64748b',
    fontSize: 12,
  },
  statusBlock: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sizeText: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#2d2d4e',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6c63ff',
    borderRadius: 2,
  },
  errorText: {
    color: '#f87171',
    fontSize: 11,
    marginTop: 4,
  },
});
