import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ModelDownloadStatus } from '../hooks/useModelStatus';
import { formatBytes } from '../utils/fileSystem';
import { COLORS, FONTS } from '../theme';

interface ModelDownloadCardProps {
  name: string;
  description: string;
  sizeBytes: number;
  status: ModelDownloadStatus;
}

export function ModelDownloadCard({ name, description, sizeBytes, status }: ModelDownloadCardProps) {
  const getStatusText = () => {
    if (status.downloaded) return 'Ready';
    if (status.downloading) return `${Math.round(status.progress * 100)}%`;
    if (status.error) return 'Error';
    return 'Pending';
  };

  const getStatusColor = () => {
    if (status.downloaded) return COLORS.mint;
    if (status.downloading) return COLORS.teal;
    if (status.error) return COLORS.rose;
    return COLORS.textDim;
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

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: status.downloaded ? '100%' : `${Math.round(status.progress * 100)}%`,
              backgroundColor: getStatusColor(),
            },
          ]}
        />
      </View>

      {status.error && (
        <Text style={styles.errorText}>{status.error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  nameBlock: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    color: COLORS.textBright,
    fontSize: 14,
    fontFamily: FONTS.bodySemi,
    marginBottom: 2,
  },
  description: {
    color: COLORS.textDim,
    fontSize: 12,
    fontFamily: FONTS.body,
  },
  statusBlock: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 13,
    fontFamily: FONTS.bodyBold,
  },
  sizeText: {
    color: COLORS.textDim,
    fontSize: 11,
    fontFamily: FONTS.body,
    marginTop: 2,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorText: {
    color: COLORS.rose,
    fontSize: 11,
    fontFamily: FONTS.body,
    marginTop: 6,
  },
});
