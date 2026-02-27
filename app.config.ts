import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Dream Diary',
  slug: 'dream-diary',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0a0a1a',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.dreamdiary.app',
    entitlements: {
      'com.apple.developer.kernel.increased-memory-limit': true,
    },
    // @ts-ignore: deploymentTarget is a valid field not yet typed in ExpoConfig
    deploymentTarget: '16.0',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a0a1a',
    },
    package: 'com.dreamdiary.app',
    // @ts-ignore: minSdkVersion is a valid field not yet typed in ExpoConfig
    minSdkVersion: 26,
  },
  plugins: [
    [
      'llama.rn',
      {
        enableOpenCL: true,
      },
    ],
    'expo-audio',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#6c63ff',
      },
    ],
    [
      'expo-sqlite',
      {
        enableFTS: true,
        useSQLCipher: false,
        android: {
          enableCustomBuildFlags: false,
        },
      },
    ],
    './plugins/withLargeHeap',
    'expo-router',
  ],
  experiments: {
    typedRoutes: true,
  },
  scheme: 'dream-diary',
});
