import { Platform } from 'react-native';

import type { OnDeviceAIService } from './types';
import { createUnavailableAdapter } from './unavailableAdapter';

/**
 * Placeholder for an approved Android on-device rewrite engine.
 *
 * ML Kit GenAI / Gemini Nano keeps prompt content on-device for inference, but
 * the ML Kit SDK still contacts Google for model/compatibility updates and
 * sends diagnostic/usage telemetry (device identifiers, latency, API config).
 * That network behaviour does not meet Trade Report's no-transmission bar for
 * this release, so Android falls back to Whisper + LocalReportFormatter only.
 *
 * See services/voiceReport/PRIVACY.md.
 */
export function createAndroidLocalAIAdapter(): OnDeviceAIService {
  if (Platform.OS !== 'android') {
    return createUnavailableAdapter('Android local AI is only available on Android.');
  }
  return createUnavailableAdapter(
    'On-device AI rewriting is not enabled on Android yet. Your transcript stays on this device and can still be formatted locally.'
  );
}
