import { AppState, type AppStateStatus, Platform } from 'react-native';

import { audioRecordingService, type RecordingHandle } from './audioRecordingService';
import {
  draftToFieldFill,
  formatTranscriptLocally,
  transcriptToFieldFill,
} from './localReportFormatter';
import { localTranscriptionService } from './localTranscriptionService';
import { createOnDeviceAIService, type OnDeviceAIService } from './onDeviceAI';
import type {
  OnDeviceAIAvailability,
  VoiceFieldFill,
  VoiceFieldSnapshot,
  VoiceReportError,
  VoiceReportPhase,
  VoiceReportSession,
} from './types';
import {
  WhisperModelDownloadError,
  whisperModelDownloader,
} from './whisperModelDownloader';

type Listener = (session: VoiceReportSession) => void;

function emptyAvailability(): OnDeviceAIAvailability {
  return {
    status: 'unsupported',
    reason: 'On-device AI status has not been checked yet.',
  };
}

/**
 * Coordinates recording → Whisper → natural-language field split → user approval.
 * One recording can fill Summary, Materials, Labour, Private notes, and costs.
 */
export class VoiceReportController {
  private session: VoiceReportSession | null = null;
  private listeners = new Set<Listener>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private abort: AbortController | null = null;
  private recording: RecordingHandle | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private readonly ai: OnDeviceAIService;

  constructor(ai: OnDeviceAIService = createOnDeviceAIService()) {
    this.ai = ai;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.session) listener(this.session);
    return () => this.listeners.delete(listener);
  }

  getSession(): VoiceReportSession | null {
    return this.session;
  }

  async open(previousFields: VoiceFieldSnapshot): Promise<void> {
    await this.resetInternal(false);
    this.session = {
      phase: 'requestingPermission',
      targetField: 'workCompleted',
      previousFields,
      elapsedMs: 0,
      metering: 0,
      transcript: '',
      professional: null,
      error: null,
      aiAvailability: emptyAvailability(),
      modelDownload: null,
    };
    this.emit();

    if (Platform.OS === 'web') {
      this.fail({ code: 'unsupported_platform', message: 'Voice reports need the iOS or Android app.' });
      return;
    }

    const permission = await audioRecordingService.ensurePermission();
    if (permission !== 'granted') {
      this.fail({
        code: 'permission_denied',
        message: 'Microphone access is turned off. Allow it in Settings to dictate a job description.',
      });
      return;
    }

    const aiAvailability = await this.ai.getAvailability();
    const modelReady = await whisperModelDownloader.isReady();
    if (!modelReady) {
      this.patch({ phase: 'modelSetup', aiAvailability, error: null, modelDownload: null });
      this.attachAppState();
      return;
    }

    this.patch({ phase: 'ready', aiAvailability, error: null, modelDownload: null });
    void localTranscriptionService.warmUp().catch(() => undefined);
    this.attachAppState();
  }

  /** One-time download of the on-device speech model. */
  async downloadModel(): Promise<void> {
    if (
      !this.session ||
      (this.session.phase !== 'modelSetup' &&
        this.session.phase !== 'error' &&
        this.session.phase !== 'modelDownloading')
    ) {
      return;
    }

    this.abort?.abort();
    this.abort = new AbortController();
    const signal = this.abort.signal;

    this.patch({
      phase: 'modelDownloading',
      error: null,
      modelDownload: { bytesWritten: 0, totalBytes: whisperModelDownloader.getModelBytes(), ratio: 0 },
    });

    try {
      await whisperModelDownloader.ensureModel((progress) => {
        if (!this.session || this.session.phase !== 'modelDownloading') return;
        this.patch({ modelDownload: progress });
      }, signal);

      const aiAvailability = await this.ai.getAvailability();
      this.patch({
        phase: 'ready',
        aiAvailability,
        error: null,
        modelDownload: {
          bytesWritten: whisperModelDownloader.getModelBytes(),
          totalBytes: whisperModelDownloader.getModelBytes(),
          ratio: 1,
        },
      });
      void localTranscriptionService.warmUp().catch(() => undefined);
    } catch (error) {
      if (error instanceof WhisperModelDownloadError) {
        if (error.code === 'cancelled') {
          this.patch({
            phase: 'modelSetup',
            error: null,
            modelDownload: null,
          });
          return;
        }
        const code =
          error.code === 'offline'
            ? 'offline'
            : error.code === 'insufficient_storage'
              ? 'insufficient_storage'
              : 'model_download_failed';
        this.stopTick();
        this.patch({ phase: 'error', error: { code, message: error.message }, metering: 0, modelDownload: null });
        return;
      }
      this.stopTick();
      this.patch({
        phase: 'error',
        error: {
          code: 'model_download_failed',
          message: errorMessage(error, 'Could not download the speech model. Try again.'),
        },
        metering: 0,
        modelDownload: null,
      });
    } finally {
      this.abort = null;
    }
  }

  async cancelModelDownload(): Promise<void> {
    this.abort?.abort();
    await whisperModelDownloader.cancel();
    if (this.session?.phase === 'modelDownloading') {
      this.patch({ phase: 'modelSetup', modelDownload: null, error: null });
    }
  }

  async startRecording(): Promise<void> {
    if (!this.session || (this.session.phase !== 'ready' && this.session.phase !== 'readyToReview' && this.session.phase !== 'error')) {
      return;
    }

    audioRecordingService.setMeterListener((level) => {
      if (!this.session || (this.session.phase !== 'recording' && this.session.phase !== 'paused')) return;
      this.patch({ metering: level, elapsedMs: audioRecordingService.elapsedMs() });
    });
    audioRecordingService.setMaxDurationHandler(() => {
      void this.stopAndTranscribe();
    });

    try {
      await audioRecordingService.start();
      this.patch({
        phase: 'recording',
        elapsedMs: 0,
        metering: 0,
        transcript: '',
        professional: null,
        error: null,
      });
      this.startTick();
    } catch (error) {
      this.fail({ code: 'recording_failed', message: errorMessage(error, 'Recording failed.') });
    }
  }

  pauseRecording(): void {
    if (this.session?.phase !== 'recording') return;
    audioRecordingService.pause();
    this.patch({ phase: 'paused', metering: 0, elapsedMs: audioRecordingService.elapsedMs() });
  }

  resumeRecording(): void {
    if (this.session?.phase !== 'paused') return;
    audioRecordingService.resume();
    this.patch({ phase: 'recording', elapsedMs: audioRecordingService.elapsedMs() });
  }

  async stopAndTranscribe(): Promise<void> {
    if (!this.session || (this.session.phase !== 'recording' && this.session.phase !== 'paused')) return;

    this.stopTick();
    this.patch({ phase: 'transcribing', metering: 0 });

    try {
      this.recording = await audioRecordingService.stop();
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'no_speech') {
        this.fail({ code: 'no_speech', message: 'No speech detected. Try again a little closer to the phone.' });
      } else {
        this.fail({ code: 'recording_failed', message: errorMessage(error, 'Recording failed.') });
      }
      return;
    }

    this.abort = new AbortController();
    try {
      const result = await localTranscriptionService.transcribeFile(this.recording.uri, this.abort.signal);
      const formatted = formatTranscriptLocally(result.text);
      this.patch({
        phase: 'readyToReview',
        transcript: result.text,
        professional: formatted,
        error: null,
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'cancelled') {
        this.patch({ phase: 'cancelled', error: { code: 'cancelled', message: 'Cancelled.' } });
      } else if (code === 'no_speech') {
        this.fail({ code: 'no_speech', message: 'No speech detected. Try again a little closer to the phone.' });
      } else if (code === 'model_not_downloaded') {
        this.patch({ phase: 'modelSetup', error: null, modelDownload: null });
      } else if (code === 'model_unavailable') {
        this.fail({
          code: 'model_unavailable',
          message: errorMessage(
            error,
            'Voice transcription is not available in this build. Rebuild with npx expo run:android or npx expo run:ios.'
          ),
        });
      } else {
        this.fail({ code: 'transcription_failed', message: errorMessage(error, 'Transcription failed.') });
      }
    } finally {
      await audioRecordingService.deleteRecording(this.recording?.uri);
      this.recording = null;
      this.abort = null;
    }

    // Prefer on-device AI rewrite by default when the engine is ready.
    const review = this.getSession();
    if (review?.phase === 'readyToReview' && review.transcript.trim()) {
      await this.makeProfessional();
    }
  }

  async makeProfessional(): Promise<void> {
    if (!this.session || this.session.phase !== 'readyToReview' || !this.session.transcript.trim()) return;

    const availability = await this.ai.getAvailability();
    this.patch({ aiAvailability: availability });

    if (availability.status !== 'available') {
      const formatted = formatTranscriptLocally(this.session.transcript);
      this.patch({
        phase: 'readyToReview',
        professional: formatted,
        error:
          availability.status === 'installing'
            ? {
                code: 'ai_unavailable',
                message: availability.reason,
              }
            : null,
      });
      return;
    }

    this.patch({ phase: 'formatting', error: null });
    this.abort = new AbortController();
    try {
      const rewritten = await this.ai.rewrite(this.session.transcript, this.abort.signal);
      this.patch({ phase: 'readyToReview', professional: rewritten, error: null });
    } catch (error) {
      const formatted = formatTranscriptLocally(this.session.transcript);
      this.patch({
        phase: 'readyToReview',
        professional: formatted,
        error: {
          code: 'ai_failed',
          message: errorMessage(error, 'On-device rewriting failed. Showing local formatting instead.'),
        },
      });
    } finally {
      this.abort = null;
    }
  }

  setTranscript(transcript: string): void {
    if (!this.session || this.session.phase !== 'readyToReview') return;
    this.patch({ transcript, professional: formatTranscriptLocally(transcript) });
  }

  /**
   * Builds form updates from the professional draft (or raw transcript).
   * Empty draft fields leave existing boxes unchanged.
   */
  approve(which: 'transcript' | 'professional', mode: 'replace' | 'append' = 'replace'): VoiceFieldFill | null {
    if (!this.session || this.session.phase !== 'readyToReview') return null;
    if (which === 'transcript') {
      return transcriptToFieldFill(this.session.transcript, this.session.previousFields);
    }
    const draft = this.session.professional?.structured;
    if (!draft) {
      return transcriptToFieldFill(this.session.transcript, this.session.previousFields);
    }
    return draftToFieldFill(draft, this.session.previousFields, mode);
  }

  async recordAgain(): Promise<void> {
    if (!this.session) return;
    this.patch({
      phase: 'ready',
      transcript: '',
      professional: null,
      error: null,
      elapsedMs: 0,
      metering: 0,
    });
    await this.startRecording();
  }

  async cancel(): Promise<void> {
    this.abort?.abort();
    await whisperModelDownloader.cancel();
    await localTranscriptionService.cancel();
    await audioRecordingService.cancel();
    await audioRecordingService.deleteRecording(this.recording?.uri);
    this.recording = null;
    this.stopTick();
    if (this.session) {
      this.patch({ phase: 'cancelled', metering: 0 });
    }
  }

  async close(): Promise<void> {
    await this.resetInternal(true);
  }

  private fail(error: VoiceReportError): void {
    this.stopTick();
    this.patch({ phase: 'error', error, metering: 0 });
  }

  private patch(partial: Partial<VoiceReportSession>): void {
    if (!this.session) return;
    this.session = { ...this.session, ...partial };
    this.emit();
  }

  private emit(): void {
    if (!this.session) return;
    for (const listener of this.listeners) listener(this.session);
  }

  private startTick(): void {
    this.stopTick();
    this.tickTimer = setInterval(() => {
      if (!this.session || (this.session.phase !== 'recording' && this.session.phase !== 'paused')) return;
      this.patch({ elapsedMs: audioRecordingService.elapsedMs() });
    }, 200);
  }

  private stopTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private attachAppState(): void {
    this.appStateSub?.remove();
    this.appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active' && this.session?.phase === 'recording') {
        this.pauseRecording();
      }
    });
  }

  private async resetInternal(releaseWhisper: boolean): Promise<void> {
    this.abort?.abort();
    this.abort = null;
    this.stopTick();
    this.appStateSub?.remove();
    this.appStateSub = null;
    await whisperModelDownloader.cancel();
    await audioRecordingService.cancel();
    await audioRecordingService.deleteRecording(this.recording?.uri);
    this.recording = null;
    if (releaseWhisper) {
      await localTranscriptionService.release();
    }
    this.session = null;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export type { VoiceReportPhase };
