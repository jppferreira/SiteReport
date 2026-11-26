import { Directory, File, Paths, type DownloadTask } from 'expo-file-system';
import { Platform } from 'react-native';

import { logger } from '@/utils/logger';

import {
  WHISPER_MODEL_BYTES,
  WHISPER_MODEL_FILENAME,
  WHISPER_MODEL_HF_COMMIT,
  WHISPER_MODEL_ID,
  WHISPER_MODEL_SHA256,
  WHISPER_MODEL_SIZE_LABEL,
  WHISPER_MODEL_STORAGE_HEADROOM_BYTES,
  WHISPER_MODEL_URL,
} from './whisperModelConfig';

export type WhisperModelDownloadProgress = {
  bytesWritten: number;
  totalBytes: number;
  /** 0–1, or 0 when total is unknown. */
  ratio: number;
};

export type WhisperModelStatus =
  | { state: 'ready'; path: string; bytes: number }
  | { state: 'missing' }
  | { state: 'corrupt'; reason: string };

export type WhisperModelDownloadErrorCode =
  | 'offline'
  | 'insufficient_storage'
  | 'checksum_mismatch'
  | 'cancelled'
  | 'download_failed'
  | 'unsupported_platform';

export class WhisperModelDownloadError extends Error {
  readonly code: WhisperModelDownloadErrorCode;

  constructor(code: WhisperModelDownloadErrorCode, message: string) {
    super(message);
    this.name = 'WhisperModelDownloadError';
    this.code = code;
  }
}

type Manifest = {
  modelId: typeof WHISPER_MODEL_ID;
  filename: typeof WHISPER_MODEL_FILENAME;
  sha256: typeof WHISPER_MODEL_SHA256;
  bytes: typeof WHISPER_MODEL_BYTES;
  hfCommit: typeof WHISPER_MODEL_HF_COMMIT;
  installedAt: string;
};

type ProgressListener = (progress: WhisperModelDownloadProgress) => void;

/**
 * Downloads, verifies, and persists the Whisper GGML model in application-private storage.
 * Singletons prevent duplicate concurrent downloads.
 */
class WhisperModelDownloader {
  private activeTask: DownloadTask | null = null;
  private activePromise: Promise<string> | null = null;
  private progressListeners = new Set<ProgressListener>();

  getModelSizeLabel(): string {
    return WHISPER_MODEL_SIZE_LABEL;
  }

  getModelBytes(): number {
    return WHISPER_MODEL_BYTES;
  }

  getDownloadUrl(): string {
    return WHISPER_MODEL_URL;
  }

  subscribeProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  /** Absolute file URI suitable for whisper.rn `initWhisper({ filePath })`. */
  getModelFile(): File {
    return new File(this.getModelDirectory(), WHISPER_MODEL_FILENAME);
  }

  async getStatus(): Promise<WhisperModelStatus> {
    if (Platform.OS === 'web') return { state: 'missing' };

    const file = this.getModelFile();
    if (!file.exists) return { state: 'missing' };

    try {
      const valid = await this.isValidInstalledFile(file);
      if (!valid.ok) {
        return { state: 'corrupt', reason: valid.reason };
      }
      return { state: 'ready', path: file.uri, bytes: file.size };
    } catch (error) {
      logger.warn('voiceReport.whisperModelStatusFailed', { error: String(error) });
      return { state: 'corrupt', reason: 'Could not read the speech model file.' };
    }
  }

  async isReady(): Promise<boolean> {
    const status = await this.getStatus();
    return status.state === 'ready';
  }

  /**
   * Ensures a verified model file exists. Reuses a valid install across sessions and app updates.
   * Concurrent callers share one download.
   */
  async ensureModel(
    onProgress?: ProgressListener,
    signal?: AbortSignal
  ): Promise<string> {
    if (Platform.OS === 'web') {
      throw new WhisperModelDownloadError(
        'unsupported_platform',
        'Voice transcription is not available on web.'
      );
    }

    const status = await this.getStatus();
    if (status.state === 'ready') return status.path;

    if (this.activePromise) {
      const unsub = onProgress ? this.subscribeProgress(onProgress) : null;
      try {
        return await this.activePromise;
      } finally {
        unsub?.();
      }
    }

    this.activePromise = this.runDownload(onProgress, signal).finally(() => {
      this.activePromise = null;
      this.activeTask = null;
    });

    return this.activePromise;
  }

  async cancel(): Promise<void> {
    try {
      this.activeTask?.cancel();
    } catch (error) {
      logger.warn('voiceReport.whisperModelCancelFailed', { error: String(error) });
    }
  }

  private getModelDirectory(): Directory {
    // Persistent app-private storage (not cache). On Android this is under filesDir.
    // iOS Documents can be iCloud-backed; we also write a marker and prefer Application Support when resolvable.
    if (Platform.OS === 'ios') {
      const docsUri = Paths.document.uri;
      if (docsUri.includes('/Documents/')) {
        const supportUri = docsUri.replace('/Documents/', '/Library/Application Support/');
        return new Directory(supportUri, 'TradeReport', 'whisper');
      }
    }
    return new Directory(Paths.document, 'whisper');
  }

  private getManifestFile(): File {
    return new File(this.getModelDirectory(), 'model-manifest.json');
  }

  private getPartialFile(): File {
    return new File(this.getModelDirectory(), `${WHISPER_MODEL_FILENAME}.partial`);
  }

  private emitProgress(progress: WhisperModelDownloadProgress): void {
    for (const listener of this.progressListeners) listener(progress);
  }

  private async isValidInstalledFile(
    file: File
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!file.exists) return { ok: false, reason: 'missing' };
    if (file.size !== WHISPER_MODEL_BYTES) {
      return {
        ok: false,
        reason: `Unexpected size ${file.size} (expected ${WHISPER_MODEL_BYTES}).`,
      };
    }

    const manifest = this.readManifest();
    if (
      manifest &&
      manifest.sha256 === WHISPER_MODEL_SHA256 &&
      manifest.bytes === WHISPER_MODEL_BYTES &&
      manifest.modelId === WHISPER_MODEL_ID
    ) {
      // Trusted prior install — skip full re-hash (74 MB) on every warm start.
      return { ok: true };
    }

    const digest = await file.digest('SHA-256');
    if (digest.toLowerCase() !== WHISPER_MODEL_SHA256) {
      return { ok: false, reason: 'SHA-256 mismatch.' };
    }
    await this.writeManifest();
    return { ok: true };
  }

  private readManifest(): Manifest | null {
    try {
      const file = this.getManifestFile();
      if (!file.exists) return null;
      const parsed = JSON.parse(file.textSync()) as Manifest;
      if (
        typeof parsed?.sha256 === 'string' &&
        typeof parsed?.bytes === 'number' &&
        typeof parsed?.modelId === 'string'
      ) {
        return parsed;
      }
    } catch {
      // Corrupt manifest → fall through to full digest.
    }
    return null;
  }

  private async writeManifest(): Promise<void> {
    try {
      const dir = this.getModelDirectory();
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      const manifest: Manifest = {
        modelId: WHISPER_MODEL_ID,
        filename: WHISPER_MODEL_FILENAME,
        sha256: WHISPER_MODEL_SHA256,
        bytes: WHISPER_MODEL_BYTES,
        hfCommit: WHISPER_MODEL_HF_COMMIT,
        installedAt: new Date().toISOString(),
      };
      const file = this.getManifestFile();
      if (file.exists) file.delete();
      file.create();
      await file.write(JSON.stringify(manifest));
    } catch (error) {
      logger.warn('voiceReport.whisperManifestWriteFailed', { error: String(error) });
    }
  }

  private assertStorageAvailable(): void {
    const needed = WHISPER_MODEL_BYTES + WHISPER_MODEL_STORAGE_HEADROOM_BYTES;
    const available = Paths.availableDiskSpace;
    if (typeof available === 'number' && available >= 0 && available < needed) {
      throw new WhisperModelDownloadError(
        'insufficient_storage',
        `Not enough free storage to download the ${WHISPER_MODEL_SIZE_LABEL} speech model. Free some space and try again.`
      );
    }
  }

  private async assertOnline(signal?: AbortSignal): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort);
      try {
        // Range probe — Hugging Face may not honour HEAD.
        await fetch(WHISPER_MODEL_URL, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
      }
    } catch (error) {
      if (signal?.aborted) {
        throw new WhisperModelDownloadError('cancelled', 'Download cancelled.');
      }
      throw new WhisperModelDownloadError(
        'offline',
        'No internet connection. Connect once to download the speech model. After that, voice reports work offline.'
      );
    }
  }

  private async runDownload(
    onProgress?: ProgressListener,
    signal?: AbortSignal
  ): Promise<string> {
    const unsub = onProgress ? this.subscribeProgress(onProgress) : null;
    const onAbort = () => {
      void this.cancel();
    };
    signal?.addEventListener('abort', onAbort);

    try {
      if (signal?.aborted) {
        throw new WhisperModelDownloadError('cancelled', 'Download cancelled.');
      }

      this.assertStorageAvailable();
      await this.assertOnline(signal);

      const dir = this.getModelDirectory();
      if (!dir.exists) {
        dir.create({ intermediates: true, idempotent: true });
      }

      const destination = this.getModelFile();
      const partial = this.getPartialFile();

      // Clear any incomplete or corrupt prior attempt.
      if (partial.exists) {
        try {
          partial.delete();
        } catch {
          /* ignore */
        }
      }
      if (destination.exists) {
        const valid = await this.isValidInstalledFile(destination);
        if (valid.ok) return destination.uri;
        try {
          destination.delete();
        } catch {
          /* ignore */
        }
      }

      this.emitProgress({ bytesWritten: 0, totalBytes: WHISPER_MODEL_BYTES, ratio: 0 });

      const task = File.createDownloadTask(WHISPER_MODEL_URL, partial, {
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'TradeReport-App',
        },
        onProgress: ({ bytesWritten, totalBytes }) => {
          const total = totalBytes > 0 ? totalBytes : WHISPER_MODEL_BYTES;
          this.emitProgress({
            bytesWritten,
            totalBytes: total,
            ratio: total > 0 ? Math.min(1, bytesWritten / total) : 0,
          });
        },
      });
      this.activeTask = task;

      let downloaded: File | null;
      try {
        downloaded = await task.downloadAsync();
      } catch (error) {
        if (signal?.aborted) {
          throw new WhisperModelDownloadError('cancelled', 'Download cancelled.');
        }
        const message = error instanceof Error ? error.message : String(error);
        if (/network|offline|internet|timed?\s*out|abort/i.test(message)) {
          throw new WhisperModelDownloadError(
            'offline',
            'Download failed because there is no reliable internet connection. Try again when you are online.'
          );
        }
        throw new WhisperModelDownloadError(
          'download_failed',
          'Could not download the speech model. Check your connection and try again.'
        );
      }

      if (!downloaded || signal?.aborted) {
        throw new WhisperModelDownloadError('cancelled', 'Download cancelled.');
      }

      if (downloaded.size !== WHISPER_MODEL_BYTES) {
        try {
          downloaded.delete();
        } catch {
          /* ignore */
        }
        throw new WhisperModelDownloadError(
          'checksum_mismatch',
          'The downloaded speech model was incomplete. Please try again.'
        );
      }

      const digest = await downloaded.digest('SHA-256');
      if (digest.toLowerCase() !== WHISPER_MODEL_SHA256) {
        try {
          downloaded.delete();
        } catch {
          /* ignore */
        }
        throw new WhisperModelDownloadError(
          'checksum_mismatch',
          'The downloaded speech model failed security verification. Please try again.'
        );
      }

      // Atomic-ish publish: move validated partial into the final name.
      if (destination.exists) {
        try {
          destination.delete();
        } catch {
          /* ignore */
        }
      }
      downloaded.moveSync(destination);
      await this.writeManifest();

      this.emitProgress({
        bytesWritten: WHISPER_MODEL_BYTES,
        totalBytes: WHISPER_MODEL_BYTES,
        ratio: 1,
      });

      logger.info('voiceReport.whisperModelInstalled', {
        bytes: WHISPER_MODEL_BYTES,
        modelId: WHISPER_MODEL_ID,
      });

      return destination.uri;
    } finally {
      signal?.removeEventListener('abort', onAbort);
      unsub?.();
      this.activeTask = null;
    }
  }
}

export const whisperModelDownloader = new WhisperModelDownloader();
