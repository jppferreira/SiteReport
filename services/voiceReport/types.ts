import type { PricingCategory, ReportPricing } from '@/models';

/** Lifecycle states for the voice-to-report flow. */
export type VoiceReportPhase =
  | 'idle'
  | 'requestingPermission'
  | 'modelSetup'
  | 'modelDownloading'
  | 'ready'
  | 'recording'
  | 'paused'
  | 'transcribing'
  | 'formatting'
  | 'readyToReview'
  | 'error'
  | 'cancelled';

export type VoiceReportErrorCode =
  | 'permission_denied'
  | 'recording_failed'
  | 'no_speech'
  | 'model_unavailable'
  | 'model_not_downloaded'
  | 'model_download_failed'
  | 'insufficient_storage'
  | 'offline'
  | 'transcription_failed'
  | 'ai_unavailable'
  | 'ai_busy'
  | 'ai_failed'
  | 'cancelled'
  | 'storage'
  | 'unsupported_platform'
  | 'unknown';

/** Progress while downloading the on-device Whisper model. */
export type VoiceModelDownloadProgress = {
  bytesWritten: number;
  totalBytes: number;
  ratio: number;
};

export type VoiceReportError = {
  code: VoiceReportErrorCode;
  message: string;
};

/** Spoken cost line extracted for the pricing reference. */
export type VoicePricingLineDraft = {
  description: string;
  category: PricingCategory;
  /** Pounds as a typed string, e.g. "85" or "120.50". */
  amount: string;
};

/**
 * Structured draft mapped to Work Summary form boxes.
 * Empty strings mean “leave that box alone” when applying.
 */
export type StructuredReportDraft = {
  workCompleted: string;
  materials: string;
  labour: string;
  privateNotes: string;
  pricingLines: VoicePricingLineDraft[];
};

export type ProfessionalRewriteSource = 'on_device_ai' | 'local_formatter';

export type ProfessionalRewriteResult = {
  source: ProfessionalRewriteSource;
  structured: StructuredReportDraft;
  /** Combined preview text for the review sheet. */
  text: string;
};

export type TranscriptionResult = {
  text: string;
  durationMs: number;
};

export type OnDeviceAIAvailability =
  | { status: 'available'; engine: 'apple_foundation' | 'android_local' }
  | { status: 'unavailable'; reason: string }
  | { status: 'installing'; reason: string }
  | { status: 'unsupported'; reason: string };

export type VoiceReportTargetField = 'workCompleted' | 'materials' | 'recommendations' | 'notes' | 'jobDescription';

/** Snapshot of form fields before a voice insert (for undo). */
export type VoiceFieldSnapshot = {
  workCompleted: string;
  materials: string;
  recommendations: string;
  notes: string;
  pricing: ReportPricing;
};

/** Values to write into the Work Summary form after approval. */
export type VoiceFieldFill = {
  workCompleted: string | null;
  materials: string | null;
  recommendations: string | null;
  notes: string | null;
  pricing: ReportPricing | null;
};

export type VoiceReportSession = {
  phase: VoiceReportPhase;
  targetField: VoiceReportTargetField;
  /** Existing form values before this session; restored on cancel / undo. */
  previousFields: VoiceFieldSnapshot;
  elapsedMs: number;
  metering: number;
  transcript: string;
  professional: ProfessionalRewriteResult | null;
  error: VoiceReportError | null;
  aiAvailability: OnDeviceAIAvailability;
  /** Present while the one-time speech model is downloading. */
  modelDownload: VoiceModelDownloadProgress | null;
};
