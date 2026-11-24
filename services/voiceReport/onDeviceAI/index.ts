import { Platform } from 'react-native';

import { createAndroidLocalAIAdapter } from './androidLocalAIAdapter';
import { createAppleFoundationModelsAdapter } from './appleFoundationModelsAdapter';
import type { OnDeviceAIService } from './types';
import { createUnavailableAdapter } from './unavailableAdapter';

export type { OnDeviceAIService } from './types';
export { UK_TRADES_REWRITE_INSTRUCTIONS, UK_TRADES_REWRITE_USER_PREFIX } from './prompts';

export function createOnDeviceAIService(): OnDeviceAIService {
  if (Platform.OS === 'ios') return createAppleFoundationModelsAdapter();
  if (Platform.OS === 'android') return createAndroidLocalAIAdapter();
  return createUnavailableAdapter('On-device AI rewriting is not available on this platform.');
}
