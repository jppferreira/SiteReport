jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US', languageCode: 'en' }],
}));

jest.mock(
  'whisper.rn',
  () => ({
    initWhisper: jest.fn(async () => ({
      transcribe: () => ({
        stop: async () => undefined,
        promise: Promise.resolve({ result: '', isAborted: false }),
      }),
      release: async () => undefined,
      gpu: false,
      reasonNoGPU: 'mock',
    })),
    releaseAllWhisper: jest.fn(async () => undefined),
  }),
  { virtual: true }
);

jest.mock('@fugood/react-native-audio-pcm-stream', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('apple-foundation-models', () => ({
  isAvailable: () => false,
  getAvailability: async () => ({
    status: 'unsupported',
    reason: 'mock',
  }),
  rewrite: async () => {
    throw new Error('mock');
  },
}));

jest.mock('expo-audio', () => ({
  AudioModule: {
    getRecordingPermissionsAsync: async () => ({ granted: true }),
    requestRecordingPermissionsAsync: async () => ({ granted: true }),
  },
  setAudioModeAsync: async () => undefined,
  RecordingPresets: { HIGH_QUALITY: {}, LOW_QUALITY: {} },
}));
