import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'dreAmI',
  slug: 'dreami',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    backgroundColor: '#0b1630',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'llc.lemang.dreami',
    entitlements: {
      'com.apple.developer.kernel.increased-memory-limit': true,
    },
    // @ts-ignore: deploymentTarget is a valid field not yet typed in ExpoConfig
    deploymentTarget: '16.0',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#0a0a1a',
    },
    package: 'llc.lemang.dreami',
    // @ts-ignore: minSdkVersion is a valid field not yet typed in ExpoConfig
    minSdkVersion: 26,
  },
  plugins: [
    [
      'llama.rn',
      {
        enableOpenCLAndHexagon: true,
      },
    ],
    'expo-audio',
    [
      'expo-notifications',
      {
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
    'expo-system-ui',
    './plugins/withLargeHeap',
    './plugins/withFollyFix',
    'expo-router',
  ],
  experiments: {
    typedRoutes: true,
  },
  scheme: 'dreami',
});
