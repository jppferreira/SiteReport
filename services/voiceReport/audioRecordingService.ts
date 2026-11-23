import { AudioModule, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { base64ToBytes } from '@/services/fileUri';
import { temporaryFilePath } from '@/services/fileService';
import { logger } from '@/utils/logger';

import {
  ANDROID_VOICE_RECOGNITION_SOURCE,
  MAX_RECORDING_MS,
  VOICE_BITS_PER_SAMPLE,
  VOICE_CHANNELS,
  VOICE_SAMPLE_RATE,
} from './constants';
import { concatUint8, pcm16Metering, pcm16ToWavBase64 } from './pcmToWav';

type LiveAudioStream = {
  init: (options: Record<string, unknown>) => void;
  start: () => void;
  stop: () => void | Promise<unknown>;
  on: (event: 'data', callback: (data: string) => void) => { remove: () => void } | void;
};

export type RecordingHandle = {
  /** Absolute file URI to a temporary WAV file. */
  uri: string;
  durationMs: number;
  /** Peak metering observed while recording (0–1). */
  peakMetering: number;
};

type MeterListener = (level: number) => void;

/**
 * Captures microphone audio as 16 kHz mono PCM, writes a temporary WAV, and
 * deletes it after transcription unless the caller asks to keep it.
 */
export class AudioRecordingService {
  private chunks: Uint8Array[] = [];
  private subscription: { remove: () => void } | null = null;
  private startedAt = 0;
  private pausedAt: number | null = null;
  private pausedAccumulatedMs = 0;
  private paused = false;
  private peakMetering = 0;
  private meterListener: MeterListener | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private onMaxDuration: (() => void) | null = null;
  private activeUri: string | null = null;
  private stream: LiveAudioStream | null = null;

  setMeterListener(listener: MeterListener | null): void {
    this.meterListener = listener;
  }

  setMaxDurationHandler(handler: (() => void) | null): void {
    this.onMaxDuration = handler;
  }

  async ensurePermission(): Promise<'granted' | 'denied'> {
    if (Platform.OS === 'web') return 'denied';
    const current = await AudioModule.getRecordingPermissionsAsync();
    if (current.granted) return 'granted';
    const next = await AudioModule.requestRecordingPermissionsAsync();
    return next.granted ? 'granted' : 'denied';
  }

  async start(): Promise<void> {
    if (Platform.OS === 'web') {
      throw new Error('Voice recording is not available on web.');
    }

    await this.cleanupSession(false);
    this.stream = loadLiveAudioStream();
    if (!this.stream) {
      throw new Error('Native audio capture is not available in this build.');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    });

    const fileName = `voice-report-${Date.now()}.wav`;
    const path = temporaryFilePath(fileName);
    this.activeUri = path.startsWith('file://') ? path : `file://${path}`;

    this.stream.init({
      sampleRate: VOICE_SAMPLE_RATE,
      channels: VOICE_CHANNELS,
      bitsPerSample: VOICE_BITS_PER_SAMPLE,
      audioSource: ANDROID_VOICE_RECOGNITION_SOURCE,
      bufferSize: 4096,
      wavFile: fileName,
    });

    this.chunks = [];
    this.peakMetering = 0;
    this.paused = false;
    this.pausedAccumulatedMs = 0;
    this.pausedAt = null;
    this.startedAt = Date.now();

    const subscription = this.stream.on('data', (data: string) => {
      if (this.paused) return;
      try {
        const bytes = base64ToBytes(data);
        this.chunks.push(bytes);
        const level = pcm16Metering(data);
        this.peakMetering = Math.max(this.peakMetering, level);
        this.meterListener?.(level);
      } catch (error) {
        logger.warn('voiceReport.meteringFailed', { error: String(error) });
      }
    });
    this.subscription = subscription && 'remove' in subscription ? subscription : null;

    this.stream.start();
    this.maxTimer = setTimeout(() => {
      this.onMaxDuration?.();
    }, MAX_RECORDING_MS);
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.pausedAt = Date.now();
    this.meterListener?.(0);
  }

  resume(): void {
    if (!this.paused) return;
    if (this.pausedAt != null) {
      this.pausedAccumulatedMs += Date.now() - this.pausedAt;
    }
    this.pausedAt = null;
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  elapsedMs(): number {
    if (!this.startedAt) return 0;
    const pausedExtra = this.paused && this.pausedAt != null ? Date.now() - this.pausedAt : 0;
    return Math.max(0, Date.now() - this.startedAt - this.pausedAccumulatedMs - pausedExtra);
  }

  async stop(): Promise<RecordingHandle> {
    if (this.maxTimer) {
      clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }

    const durationMs = this.elapsedMs();
    try {
      await this.stream?.stop();
    } catch (error) {
      logger.warn('voiceReport.stopStreamFailed', { error: String(error) });
    }
    this.subscription?.remove();
    this.subscription = null;

    const pcm = concatUint8(this.chunks);
    this.chunks = [];
    if (pcm.byteLength < VOICE_SAMPLE_RATE) {
      // Less than ~0.5s of mono 16-bit audio at 16 kHz is almost certainly silence.
      await this.deleteUri(this.activeUri);
      this.activeUri = null;
      throw Object.assign(new Error('No speech detected.'), { code: 'no_speech' as const });
    }

    const wavBase64 = pcm16ToWavBase64(pcm);
    const uri = this.activeUri ?? `file://${temporaryFilePath(`voice-report-${Date.now()}.wav`)}`;
    await FileSystem.writeAsStringAsync(uri, wavBase64, { encoding: FileSystem.EncodingType.Base64 });

    // Exclude temporary recordings from iCloud/automatic backup where supported.
    if (Platform.OS === 'ios') {
      try {
        await FileSystem.writeAsStringAsync(`${uri}.nomedia`, '', { encoding: FileSystem.EncodingType.UTF8 });
      } catch {
        // Best-effort only.
      }
    }

    const handle = { uri, durationMs, peakMetering: this.peakMetering };
    this.activeUri = null;
    this.startedAt = 0;
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    return handle;
  }

  async cancel(): Promise<void> {
    await this.cleanupSession(true);
  }

  async deleteRecording(uri: string | null | undefined): Promise<void> {
    await this.deleteUri(uri);
  }

  private async cleanupSession(deleteFile: boolean): Promise<void> {
    if (this.maxTimer) {
      clearTimeout(this.maxTimer);
      this.maxTimer = null;
    }
    try {
      await this.stream?.stop();
    } catch {
      // ignore
    }
    this.subscription?.remove();
    this.subscription = null;
    this.chunks = [];
    this.startedAt = 0;
    this.paused = false;
    if (deleteFile) await this.deleteUri(this.activeUri);
    this.activeUri = null;
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    } catch {
      // ignore
    }
  }

  private async deleteUri(uri: string | null | undefined): Promise<void> {
    if (!uri) return;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      logger.warn('voiceReport.deleteTempFailed', { error: String(error) });
    }
  }
}

function loadLiveAudioStream(): LiveAudioStream | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@fugood/react-native-audio-pcm-stream');
    return (mod.default ?? mod) as LiveAudioStream;
  } catch {
    return null;
  }
}

export const audioRecordingService = new AudioRecordingService();
