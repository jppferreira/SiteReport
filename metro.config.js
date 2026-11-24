// Required for expo-sqlite's web (WASM) backend: https://docs.expo.dev/versions/latest/sdk/sqlite/#usage
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');
// whisper.rn: bundled GGML model (+ optional Core ML assets later)
config.resolver.assetExts.push('bin', 'mil');
// Transparent report-build loop for web / tooling
config.resolver.assetExts.push('webm');

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    // Needed so the browser allows the SharedArrayBuffer the SQLite WASM worker relies on.
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return middleware(req, res, next);
  };
};

module.exports = config;
