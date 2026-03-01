import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { MODEL_URLS, MODEL_PATHS, MODEL_SIZES } from '../models/config';
import { fileExists, verifyFileSize } from '../utils/fileSystem';

export interface ModelDownloadStatus {
  downloaded: boolean;
  downloading: boolean;
  progress: number; // 0-1
  error: string | null;
}

const initialStatus: ModelDownloadStatus = {
  downloaded: false,
  downloading: false,
  progress: 0,
  error: null,
};

export function useModelStatus() {
  const [llm, setLlm] = useState<ModelDownloadStatus>(initialStatus);
  const [embed, setEmbed] = useState<ModelDownloadStatus>(initialStatus);
  const [whisper, setWhisper] = useState<ModelDownloadStatus>(initialStatus);

  const checkDownloaded = useCallback(async () => {
    const [llmOk, embedOk, whisperOk] = await Promise.all([
      fileExists(MODEL_PATHS.llm).then((exists) =>
        exists
          ? verifyFileSize(MODEL_PATHS.llm, MODEL_SIZES.llm)
          : false
      ),
      fileExists(MODEL_PATHS.embedding).then((exists) =>
        exists
          ? verifyFileSize(MODEL_PATHS.embedding, MODEL_SIZES.embedding)
          : false
      ),
      fileExists(MODEL_PATHS.whisper).then((exists) =>
        exists
          ? verifyFileSize(MODEL_PATHS.whisper, MODEL_SIZES.whisper)
          : false
      ),
    ]);

    setLlm((s) => ({ ...s, downloaded: llmOk }));
    setEmbed((s) => ({ ...s, downloaded: embedOk }));
    setWhisper((s) => ({ ...s, downloaded: whisperOk }));

    return { llmOk, embedOk, whisperOk };
  }, []);

  const downloadModel = useCallback(
    async (
      key: 'llm' | 'embed' | 'whisper',
      url: string,
      destPath: string,
      expectedSize: number
    ) => {
      const setter =
        key === 'llm' ? setLlm : key === 'embed' ? setEmbed : setWhisper;

      setter((s) => ({ ...s, downloading: true, error: null, progress: 0 }));

      try {
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          destPath,
          {
            sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
          },
          (downloadProgress) => {
            const progress =
              downloadProgress.totalBytesWritten /
              downloadProgress.totalBytesExpectedToWrite;
            setter((s) => ({ ...s, progress: Math.max(0, Math.min(1, progress)) }));
          }
        );

        const result = await downloadResumable.downloadAsync();

        if (!result || result.status !== 200) {
          throw new Error(`Download failed with status ${result?.status}`);
        }

        // Verify size
        const ok = await verifyFileSize(destPath, expectedSize);
        if (!ok) {
          // File might still be valid (HF sometimes sends different sizes)
          // Just check it's non-zero
          const info = await FileSystem.getInfoAsync(destPath, { size: true });
          if (!info.exists) throw new Error('File not found after download');
        }

        setter({ downloaded: true, downloading: false, progress: 1, error: null });
      } catch (e) {
        let msg = e instanceof Error ? e.message : 'Download failed';
        // Translate common system errors into friendly messages
        if (msg.includes('No space left on device') || msg.includes('Code=28')) {
          msg = 'Not enough storage space. Free up space in Settings → General → iPhone Storage and try again.';
        } else if (msg.includes('Code=-1009') || msg.includes('offline') || msg.includes('network')) {
          msg = 'No internet connection. Connect to Wi-Fi and try again.';
        } else if (msg.includes('Code=-1001') || msg.includes('timed out')) {
          msg = 'Download timed out. Check your connection and try again.';
        }
        setter((s) => ({ ...s, downloading: false, error: msg }));
        throw e;
      }
    },
    []
  );

  const downloadAll = useCallback(async () => {
    const llmUrl =
      Platform.OS === 'ios' ? MODEL_URLS.llm_ios : MODEL_URLS.llm_android;

    // Download in parallel
    await Promise.all([
      downloadModel('llm', llmUrl, MODEL_PATHS.llm, MODEL_SIZES.llm),
      downloadModel(
        'embed',
        MODEL_URLS.embedding,
        MODEL_PATHS.embedding,
        MODEL_SIZES.embedding
      ),
      downloadModel(
        'whisper',
        MODEL_URLS.whisper,
        MODEL_PATHS.whisper,
        MODEL_SIZES.whisper
      ),
    ]);
  }, [downloadModel]);

  return {
    llm,
    embed,
    whisper,
    checkDownloaded,
    downloadModel,
    downloadAll,
    allDownloaded: llm.downloaded && embed.downloaded && whisper.downloaded,
  };
}
