const { requireNativeModule } = require('expo-modules-core');

/** @type {null | { getAvailability: () => Promise<Record<string, string>>; rewrite: (transcript: string) => Promise<Record<string, string>> }} */
let native = null;

try {
  native = requireNativeModule('AppleFoundationModels');
} catch {
  native = null;
}

module.exports = {
  isAvailable() {
    return native != null;
  },
  getAvailability() {
    if (!native) {
      return Promise.resolve({
        status: 'unsupported',
        reason: 'Apple Foundation Models native module is not linked on this build.',
      });
    }
    return native.getAvailability();
  },
  rewrite(transcript) {
    if (!native) {
      return Promise.reject(new Error('Apple Foundation Models native module is not linked.'));
    }
    return native.rewrite(transcript);
  },
};
