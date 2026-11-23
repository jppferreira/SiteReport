import { Platform } from 'react-native';

import { emptyStructuredDraft, structuredDraftToReportText } from '../localReportFormatter';
import type {
  OnDeviceAIAvailability,
  ProfessionalRewriteResult,
  StructuredReportDraft,
  VoicePricingLineDraft,
} from '../types';
import type { OnDeviceAIService } from './types';
import { createUnavailableAdapter } from './unavailableAdapter';

type NativeModule = {
  isAvailable: () => boolean;
  getAvailability: () => Promise<Record<string, string>>;
  rewrite: (transcript: string) => Promise<Record<string, string>>;
};

function loadNative(): NativeModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('apple-foundation-models') as NativeModule;
  } catch {
    return null;
  }
}

function parsePricingLines(raw: string | undefined): VoicePricingLineDraft[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): VoicePricingLineDraft | null => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const description = typeof row.description === 'string' ? row.description.trim() : '';
        const amount = typeof row.amount === 'string' ? row.amount.trim() : String(row.amount ?? '').trim();
        const categoryRaw = typeof row.category === 'string' ? row.category : 'other';
        const category =
          categoryRaw === 'materials' || categoryRaw === 'labour' || categoryRaw === 'other'
            ? categoryRaw
            : 'other';
        if (!description && !amount) return null;
        return { description: description || 'Cost', category, amount };
      })
      .filter((line): line is VoicePricingLineDraft => line != null);
  } catch {
    return [];
  }
}

export function createAppleFoundationModelsAdapter(): OnDeviceAIService {
  const native = loadNative();
  if (!native?.isAvailable()) {
    return createUnavailableAdapter(
      Platform.OS === 'ios'
        ? 'Apple Foundation Models are not linked in this build.'
        : 'Apple Foundation Models are only available on iOS.'
    );
  }

  return {
    async getAvailability(): Promise<OnDeviceAIAvailability> {
      const raw = await native.getAvailability();
      const status = raw.status ?? 'unavailable';
      if (status === 'available') {
        return { status: 'available', engine: 'apple_foundation' };
      }
      if (status === 'installing') {
        return { status: 'installing', reason: raw.reason ?? 'Model is installing.' };
      }
      if (status === 'unsupported') {
        return { status: 'unsupported', reason: raw.reason ?? 'Unsupported device.' };
      }
      return { status: 'unavailable', reason: raw.reason ?? 'Model unavailable.' };
    },

    async rewrite(transcript: string): Promise<ProfessionalRewriteResult> {
      const raw = await native.rewrite(transcript);
      const structured: StructuredReportDraft = {
        ...emptyStructuredDraft(),
        workCompleted: raw.workCompleted?.trim() ?? '',
        materials: raw.materials?.trim() ?? '',
        labour: raw.labour?.trim() ?? '',
        privateNotes: raw.privateNotes?.trim() ?? '',
        pricingLines: parsePricingLines(raw.pricingLinesJson),
      };
      // Back-compat if an older native binary still returns legacy keys.
      if (!structured.workCompleted && (raw.checksPerformed || raw.outcome || raw.outstandingWork)) {
        structured.workCompleted = [raw.workCompleted, raw.checksPerformed, raw.outcome, raw.outstandingWork]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(' ');
      }
      if (!structured.privateNotes && raw.additionalNotes?.trim()) {
        structured.privateNotes = raw.additionalNotes.trim();
      }
      return {
        source: 'on_device_ai',
        structured,
        text: structuredDraftToReportText(structured),
      };
    },
  };
}
