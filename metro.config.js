// Required for expo-sqlite's web (WASM) backend: https://docs.expo.dev/versions/latest/sdk/sqlite/#usage
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
// Optional local Whisper tooling assets (not required() into the production bundle)
config.resolver.assetExts.push('bin', 'mil');
// Transparent report-build loop for web / tooling
config.resolver.assetExts.push('webm');

// Only Ionicons is used in app source. Block other vector-icon TTF packs so they
// are not copied into Android res/raw / iOS bundles (~several MB).
const vectorIconFonts = path.sep + path.join(
  'node_modules',
  '@expo',
  'vector-icons',
  'build',
  'vendor',
  'react-native-vector-icons',
  'Fonts',
  path.sep
);
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  new RegExp(
    `${vectorIconFonts.replace(/[/\\]/g, '[/\\\\]')}(?!Ionicons\\.ttf$).+\\.ttf$`
  ),
];

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    // Needed so the browser allows the SharedArrayBuffer the SQLite WASM worker relies on.
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  };
};

module.exports = config;
