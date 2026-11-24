jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: () => null,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    executionEnvironment: 'storeClient',
    appOwnership: 'expo',
  },
  ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
}));

import { getArCapabilities } from './arCapabilities';

describe('getArCapabilities', () => {
  it('returns unsupported in Expo Go without importing expo-ar', () => {
    expect(getArCapabilities()).toEqual({
      arSupported: false,
      depthOrLidarAvailable: false,
      geoTrackingSupported: false,
    });
  });
});
