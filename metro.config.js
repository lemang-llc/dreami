const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .bin and .mil for Whisper model assets, .sql for Drizzle migrations
config.resolver.assetExts.push('bin', 'mil');
config.resolver.sourceExts.push('sql');

module.exports = config;
