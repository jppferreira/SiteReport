import type { OnDeviceAIAvailability, ProfessionalRewriteResult } from '../types';

export type OnDeviceAIService = {
  /** Runtime probe — never assumes the model is present. */
  getAvailability(): Promise<OnDeviceAIAvailability>;
  /**
   * Rewrites a transcript into structured professional British English.
   * Must keep all inference on-device. Throws if the engine is unavailable.
   */
  rewrite(transcript: string, signal?: AbortSignal): Promise<ProfessionalRewriteResult>;
};
