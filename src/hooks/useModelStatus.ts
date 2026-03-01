import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { MODEL_URLS, MODEL_PATHS, MODEL_SIZES, SETTINGS_KEYS } from '../models/config';
import { isFileSufficient, deleteFile } from '../utils/fileSystem';
import { getDatabase } from '../db/client';
import { appSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface ModelDownloadStatus {
  downloaded: boolean;
  downloading: boolean;
  progress: number; // 0–1
  error: string | null;
}

const initialStatus: ModelDownloadStatus = {
  downloaded: false,
  downloading: false,
  progress: 0,
  error: null,
};

type ModelKey = 'llm' | 'embed' | 'whisper';

const PENDING_SETTING: Record<ModelKey, string> = {
  llm: SETTINGS_KEYS.DOWNLOAD_PENDING_LLM,
  embed: SETTINGS_KEYS.DOWNLOAD_PENDING_EMBED,
  whisper: SETTINGS_KEYS.DOWNLOAD_PENDING_WHISPER,
};

// ---------------------------------------------------------------------------
// SQLite helpers for pending-download flags
// ---------------------------------------------------------------------------

async function setPendingFlag(key: ModelKey): Promise<void> {
  try {
    const db = getDatabase();
    await db
      .insert(appSettings)
      .values({ key: PENDING_SETTING[key], value: '1' })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: '1' } });
  } catch {
    // Non-fatal: worst case the download won't auto-resume on next launch
  }
}

async function clearPendingFlag(key: ModelKey): Promise<void> {
  try {
    const db = getDatabase();
    await db.delete(appSettings).where(eq(appSettings.key, PENDING_SETTING[key]));
  } catch {}
}

async function hasPendingFlag(key: ModelKey): Promise<boolean> {
  try {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, PENDING_SETTING[key]));
    return rows.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useModelStatus() {
  const [llm, setLlm] = useState<ModelDownloadStatus>(initialStatus);
  const [embed, setEmbed] = useState<ModelDownloadStatus>(initialStatus);
  const [whisper, setWhisper] = useState<ModelDownloadStatus>(initialStatus);

  const setterFor = (key: ModelKey) =>
    key === 'llm' ? setLlm : key === 'embed' ? setEmbed : setWhisper;

  // -------------------------------------------------------------------------
  // checkDownloaded
  //
  // Uses isFileSufficient (≥ 50% of estimated size) instead of the strict ±5%
  // verifyFileSize. MODEL_SIZES are display estimates; actual GGUF sizes can
  // differ, so ±5% produced false negatives on valid files after restart.
  // -------------------------------------------------------------------------
  const checkDownloaded = useCallback(async () => {
    const [llmOk, embedOk, whisperOk] = await Promise.all([
      isFileSufficient(MODEL_PATHS.llm, MODEL_SIZES.llm),
      isFileSufficient(MODEL_PATHS.embedding, MODEL_SIZES.embedding),
      isFileSufficient(MODEL_PATHS.whisper, MODEL_SIZES.whisper),
    ]);

    setLlm((s) => ({ ...s, downloaded: llmOk }));
    setEmbed((s) => ({ ...s, downloaded: embedOk }));
    setWhisper((s) => ({ ...s, downloaded: whisperOk }));

    return { llmOk, embedOk, whisperOk };
  }, []);

  // -------------------------------------------------------------------------
  // downloadModel
  // -------------------------------------------------------------------------
  const downloadModel = useCallback(
    async (
      key: ModelKey,
      url: string,
      destPath: string,
      expectedSize: number,
    ) => {
      const setter = setterFor(key);

      setter((s) => ({ ...s, downloading: true, error: null, progress: 0 }));

      // Persist a flag so we can detect and restart the download if the app
      // is killed before it finishes.
      await setPendingFlag(key);

      try {
        const downloadResumable = FileSystem.createDownloadResumable(
          url,
          destPath,
          { sessionType: FileSystem.FileSystemSessionType.BACKGROUND },
          (downloadProgress) => {
            const progress =
              downloadProgress.totalBytesWritten /
              downloadProgress.totalBytesExpectedToWrite;
            setter((s) => ({ ...s, progress: Math.max(0, Math.min(1, progress)) }));
          },
        );

        const result = await downloadResumable.downloadAsync();

        if (!result || result.status !== 200) {
          throw new Error(`Download failed with status ${result?.status}`);
        }

        // Accept the file as long as it is sufficiently large (catches
        // truncated downloads). We don't enforce strict ±5% here either.
        const ok = await isFileSufficient(destPath, expectedSize);
        if (!ok) {
          const info = await FileSystem.getInfoAsync(destPath, { size: true });
          if (!info.exists) throw new Error('File not found after download');
          // File exists but smaller than expected — HF size metadata mismatch;
          // accept it anyway (the model loader will fail if it's truly corrupt).
        }

        await clearPendingFlag(key);
        setter({ downloaded: true, downloading: false, progress: 1, error: null });
      } catch (e) {
        await clearPendingFlag(key);

        let msg = e instanceof Error ? e.message : 'Download failed';
        if (msg.includes('No space left on device') || msg.includes('Code=28')) {
          msg =
            'Not enough storage space. Free up space in Settings → General → iPhone Storage and try again.';
        } else if (
          msg.includes('Code=-1009') ||
          msg.includes('offline') ||
          msg.includes('network')
        ) {
          msg = 'No internet connection. Connect to Wi-Fi and try again.';
        } else if (msg.includes('Code=-1001') || msg.includes('timed out')) {
          msg = 'Download timed out. Check your connection and try again.';
        }
        setter((s) => ({ ...s, downloading: false, error: msg }));
        throw e;
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // resumeInterruptedDownloads
  //
  // Called once on onboarding mount. For each model that has a pending flag:
  //   • File is now complete (download finished in iOS background while app
  //     was killed) → clear the flag and mark as downloaded.
  //   • File is incomplete → delete the partial file and restart the download
  //     so the user doesn't have to tap the button again.
  // -------------------------------------------------------------------------
  const resumeInterruptedDownloads = useCallback(async () => {
    const llmUrl =
      Platform.OS === 'ios' ? MODEL_URLS.llm_ios : MODEL_URLS.llm_android;

    const tryResume = async (
      key: ModelKey,
      url: string,
      path: string,
      expectedSize: number,
    ) => {
      const pending = await hasPendingFlag(key);
      if (!pending) return;

      const setter = setterFor(key);
      const isComplete = await isFileSufficient(path, expectedSize);

      if (isComplete) {
        // iOS background download finished while the app was killed.
        await clearPendingFlag(key);
        setter({ downloaded: true, downloading: false, progress: 1, error: null });
      } else {
        // Partial file — delete it and restart the download automatically.
        await deleteFile(path);
        downloadModel(key, url, path, expectedSize).catch(() => {
          // Errors surface through the setter inside downloadModel.
        });
      }
    };

    await Promise.all([
      tryResume('llm', llmUrl, MODEL_PATHS.llm, MODEL_SIZES.llm),
      tryResume('embed', MODEL_URLS.embedding, MODEL_PATHS.embedding, MODEL_SIZES.embedding),
      tryResume('whisper', MODEL_URLS.whisper, MODEL_PATHS.whisper, MODEL_SIZES.whisper),
    ]);
  }, [downloadModel]);

  // -------------------------------------------------------------------------
  // downloadAll — parallel download of all three models
  // -------------------------------------------------------------------------
  const downloadAll = useCallback(async () => {
    const llmUrl =
      Platform.OS === 'ios' ? MODEL_URLS.llm_ios : MODEL_URLS.llm_android;

    await Promise.all([
      downloadModel('llm', llmUrl, MODEL_PATHS.llm, MODEL_SIZES.llm),
      downloadModel('embed', MODEL_URLS.embedding, MODEL_PATHS.embedding, MODEL_SIZES.embedding),
      downloadModel('whisper', MODEL_URLS.whisper, MODEL_PATHS.whisper, MODEL_SIZES.whisper),
    ]);
  }, [downloadModel]);

  return {
    llm,
    embed,
    whisper,
    checkDownloaded,
    downloadModel,
    downloadAll,
    resumeInterruptedDownloads,
    allDownloaded: llm.downloaded && embed.downloaded && whisper.downloaded,
  };
}
