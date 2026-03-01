import * as FileSystem from 'expo-file-system/legacy';

export const MODELS_DIR = FileSystem.documentDirectory + 'models/';
export const RECORDINGS_DIR = FileSystem.documentDirectory + 'recordings/';

export async function ensureDirectoriesExist(): Promise<void> {
  await Promise.all([
    FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true }),
    FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true }),
  ]);
}

export async function fileExists(path: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

export async function getFileSize(path: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(path, { size: true });
  if (!info.exists) return 0;
  return (info as FileSystem.FileInfo & { size: number }).size ?? 0;
}

export async function verifyFileSize(
  path: string,
  expectedBytes: number,
  tolerancePercent = 5
): Promise<boolean> {
  const size = await getFileSize(path);
  if (size === 0) return false;
  const tolerance = expectedBytes * (tolerancePercent / 100);
  return Math.abs(size - expectedBytes) <= tolerance;
}

export async function deleteFile(path: string): Promise<void> {
  const exists = await fileExists(path);
  if (exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

export async function getRecordingFiles(): Promise<string[]> {
  try {
    const files = await FileSystem.readDirectoryAsync(RECORDINGS_DIR);
    return files.map((f) => RECORDINGS_DIR + f);
  } catch {
    return [];
  }
}

export async function getModelsDirSize(): Promise<number> {
  try {
    const files = await FileSystem.readDirectoryAsync(MODELS_DIR);
    const sizes = await Promise.all(
      files.map((f) => getFileSize(MODELS_DIR + f))
    );
    return sizes.reduce((a, b) => a + b, 0);
  } catch {
    return 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
