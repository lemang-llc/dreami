const { withAndroidManifest } = require('expo/config-plugins');

const withLargeHeap = (config) => {
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:largeHeap'] = 'true';
    }
    return mod;
  });
};

module.exports = withLargeHeap;
