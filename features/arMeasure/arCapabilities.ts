import { requireOptionalNativeModule } from 'expo-modules-core';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { Capabilities } from './arTypes';

const UNSUPPORTED: Capabilities = {
  arSupported: false,
  depthOrLidarAvailable: false,
  geoTrackingSupported: false,
};

/** True when the ExpoAr native module is linked into this binary. */
function isExpoArLinked(): boolean {
  try {
    return requireOptionalNativeModule('ExpoAr') != null;
  } catch {
    return false;
  }
}

/**
 * Safe capability probe for Expo Go and store clients.
 * Never imports `@stewmore/expo-ar` — that package calls requireNativeModule at
 * load time and crashes Expo Go. Real capabilities are refined in the session
 * via onReady after a dynamic import of ArMeasureSession.
 */
export function getArCapabilities(): Capabilities {
  if (Platform.OS === 'web') return UNSUPPORTED;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return UNSUPPORTED;
  if (Constants.appOwnership === 'expo') return UNSUPPORTED;
  if (!isExpoArLinked()) return UNSUPPORTED;

  // Native module is present (dev / production build). Depth / geo are refined later.
  return {
    arSupported: true,
    depthOrLidarAvailable: false,
    geoTrackingSupported: false,
  };
}
