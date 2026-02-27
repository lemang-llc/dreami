import { ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

const withLargeHeap: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (mod) => {
    const androidManifest = mod.modResults;
    const app = androidManifest.manifest.application?.[0];
    if (app) {
      app.$['android:largeHeap'] = 'true';
    }
    return mod;
  });
};

export default withLargeHeap;
