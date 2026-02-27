import { Platform } from 'react-native';

// Adreno GPUs are Qualcomm's mobile GPU line, found in Snapdragon SoCs.
// They support OpenCL which llama.rn can use for GPU acceleration on Android.
export function isAdreno(): boolean {
  if (Platform.OS !== 'android') return false;

  // Platform.constants.Model gives the device model string on Android
  // We detect Adreno via a known Snapdragon model prefix list.
  // A more robust approach: read GPU vendor from expo-device or check
  // the renderer string. Here we use a heuristic based on common Snapdragon
  // device models that ship with Adreno GPUs (865+).
  const model: string =
    ((Platform.constants as unknown) as Record<string, string>).Model ?? '';

  // If we can't determine the model, default to CPU for safety
  if (!model) return false;

  // Snapdragon 865+ Adreno devices (non-exhaustive heuristic list)
  // In production you'd read /proc/gpuinfo or use a native module
  const adreno650PlusModels = [
    'SM-G99', // Samsung Galaxy S21/S22/S23 series
    'SM-S', // Samsung Galaxy S series
    'Pixel 5', 'Pixel 6', 'Pixel 7', 'Pixel 8', 'Pixel 9',
    'OnePlus 8', 'OnePlus 9', 'OnePlus 10', 'OnePlus 11', 'OnePlus 12',
    'POCO F3', 'POCO F4', 'POCO F5', 'POCO F6',
    'Mi 10', 'Mi 11', 'Mi 12', 'Mi 13',
    'Xiaomi 12', 'Xiaomi 13', 'Xiaomi 14',
    'ROG Phone',
  ];

  return adreno650PlusModels.some((prefix) => model.startsWith(prefix));
}

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
