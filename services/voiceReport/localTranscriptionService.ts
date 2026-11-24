import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

import { logger } from '@/utils/logger';

import { getWhisperModelAsset, WHISPER_MODEL_ID } from './constants';
import type { TranscriptionResult } from './types';

type WhisperContextLike = {
  transcribe: (
    filePath: string,
    options?: Record<string, unknown>
  ) => { stop: () => Promise<void>; promise: Promise<{ result?: string; isAborted?: boolean }> };
  release: () => Promise<void>;
};

/** True when the whisper.rn native TurboModule is present in this binary. */
export function isWhisperNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    if (TurboModuleRegistry.get('RNWhisper')) return true;
  } catch {
    // Registry can throw in some runtimes; fall through to NativeModules.
  }
  return NativeModules.RNWhisper != null;
}

/**
 * On-device Whisper transcription. No network fallback.
 */
export class LocalTranscriptionService {
  private context: WhisperContextLike | null = null;
  private initPromise: Promise<WhisperContextLike> | null = null;
  private activeStop: (() => Promise<void>) | null = null;

  async warmUp(): Promise<void> {
    if (Platform.OS === 'web' || !isWhisperNativeAvailable()) return;
    await this.getContext();
  }

  async transcribeFile(uri: string, signal?: AbortSignal): Promise<TranscriptionResult> {
    if (Platform.OS === 'web') {
      throw Object.assign(new Error('Transcription is not available on web.'), {
        code: 'unsupported_platform' as const,
      });
    }

    const started = Date.now();
    const context = await this.getContext();
    if (signal?.aborted) {
      throw Object.assign(new Error('Cancelled.'), { code: 'cancelled' as const });
    }

    const path = uri.startsWith('file://') ? uri : `file://${uri}`;
    const { stop, promise } = context.transcribe(path, {
      language: 'en',
      maxThreads: 4,
      // Keep inference off the JS thread via the native whisper worker.
    });
    this.activeStop = stop;

    const onAbort = () => {
      void stop();
    };
    signal?.addEventListener('abort', onAbort);

    try {
      const result = await promise;
      if (signal?.aborted || result.isAborted) {
        throw Object.assign(new Error('Cancelled.'), { code: 'cancelled' as const });
      }
      const text = (result.result ?? '').replace(/\s+/g, ' ').trim();
      if (!text) {
        throw Object.assign(new Error('No speech detected.'), { code: 'no_speech' as const });
      }
      return { text, durationMs: Date.now() - started };
    } finally {
      signal?.removeEventListener('abort', onAbort);
      this.activeStop = null;
    }
  }

  async cancel(): Promise<void> {
    try {
      await this.activeStop?.();
    } catch (error) {
      logger.warn('voiceReport.cancelTranscriptionFailed', { error: String(error) });
    }
  }

  async release(): Promise<void> {
    await this.cancel();
    if (this.context) {
      try {
        await this.context.release();
      } catch (error) {
        logger.warn('voiceReport.releaseWhisperFailed', { error: String(error) });
      }
    }
    this.context = null;
    this.initPromise = null;
  }

  getModelId(): string {
    return WHISPER_MODEL_ID;
  }

  private async getContext(): Promise<WhisperContextLike> {
    if (this.context) return this.context;
    if (this.initPromise) return this.initPromise;

    if (!isWhisperNativeAvailable()) {
      throw Object.assign(
        new Error(
          'Voice transcription is not linked in this build. Rebuild the app with npx expo run:android or npx expo run:ios.'
        ),
        { code: 'model_unavailable' as const }
      );
    }

    this.initPromise = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const whisper = require('whisper.rn') as {
          initWhisper: (options: { filePath: number | string; useGpu?: boolean }) => Promise<WhisperContextLike>;
        };
        if (typeof whisper?.initWhisper !== 'function') {
          throw new Error('whisper.rn initWhisper is missing');
        }
        const context = await whisper.initWhisper({
          filePath: getWhisperModelAsset(),
          useGpu: Platform.OS === 'ios',
        });
        if (!context) {
          throw new Error('whisper.rn returned no context');
        }
        this.context = context;
        return context;
      } catch (error) {
        this.initPromise = null;
        logger.error('voiceReport.whisperInitFailed', error);
        throw Object.assign(
          new Error(
            'Voice transcription failed to start. Rebuild the app with npx expo run:android or npx expo run:ios.'
          ),
          { code: 'model_unavailable' as const }
        );
      }
    })();

    return this.initPromise;
  }
}

export const localTranscriptionService = new LocalTranscriptionService();
