import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLocale } from '@/i18n';
import {
  CoverDesignId,
  DEFAULT_COVER_DESIGN,
  DEFAULT_REPORT_SECTION_ORDER,
  DEFAULT_REPORT_SECTIONS,
  DEFAULT_REPORT_TEMPLATE,
  normalizeCoverDesignId,
  normalizePhotoAnnotationLayout,
  normalizePhotoBrowseLayout,
  normalizeReportSectionOrder,
  normalizeReportSections,
  normalizeReportTemplateId,
  PhotoAnnotationLayout,
  PhotoBrowseLayout,
  ReportSectionId,
  ReportSections,
  ReportTemplateId,
} from '@/models';

const ONBOARDING_KEY = 'sitereport.onboardingComplete';
const PREFERENCES_KEY = 'sitereport.preferences';

export type PhotoQuality = 'standard' | 'high';

/** AR tape-measure display unit. */
export type MeasureUnit = 'm' | 'cm' | 'mm' | 'ftIn';

/** UI appearance: follow the device, or force light / dark. */
export type AppearancePreference = 'system' | 'light' | 'dark';

export type AppPreferences = {
  defaultPhotoQuality: PhotoQuality;
  includeSignatureByDefault: boolean;
  reportTemplate: ReportTemplateId;
  coverDesign: CoverDesignId;
  /** Annotated photo cards: stacked full width, or image beside the note cards. */
  photoAnnotationLayout: PhotoAnnotationLayout;
  /** Section photo list: full-width cards with notes, or compact thumbnails. */
  photoBrowseLayout: PhotoBrowseLayout;
  /** When on and a review URL is set, the PDF ends with a review card. */
  includeReviewLink: boolean;
  /** Which modular PDF blocks print. */
  reportSections: ReportSections;
  /** Print order for modular PDF blocks. */
  reportSectionOrder: ReportSectionId[];
  /** Copies the backup zip into iCloud Drive on iPhone. On until the user turns it off. */
  icloudAutoBackup: boolean;
  /** The one-time note about where that zip lives in the Files app. */
  icloudBackupTipSeen: boolean;
  lastIcloudBackupAt: string | null;
  /** Overlay date & time on photos (Figma Field Proof · 06). */
  stampDateTime: boolean;
  /** Overlay job postcode / address on photos. */
  stampAddress: boolean;
  /** Print the evidence stamp under each photo on the PDF. */
  stampShowOnPdf: boolean;
  /** Units used when saving AR measurements. */
  measureUnit: MeasureUnit;
  /** Last job-type chip from the guided details sheet (remembered next time). */
  lastJobTrade: string | null;
  /** Follow system appearance, or force light / dark. */
  appearance: AppearancePreference;
};

export function defaultMeasureUnit(): MeasureUnit {
  return getLocale() === 'en-US' ? 'ftIn' : 'm';
}

/** Accepts legacy 'metric' / 'imperial' values too. */
export function normalizeMeasureUnit(value: unknown): MeasureUnit {
  if (value === 'm' || value === 'cm' || value === 'mm' || value === 'ftIn') return value;
  if (value === 'imperial') return 'ftIn';
  if (value === 'metric') return 'm';
  return defaultMeasureUnit();
}

export function normalizeAppearancePreference(value: unknown): AppearancePreference {
  if (value === 'system' || value === 'light' || value === 'dark') return value;
  return 'system';
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  defaultPhotoQuality: 'standard',
  includeSignatureByDefault: true,
  reportTemplate: DEFAULT_REPORT_TEMPLATE,
  coverDesign: DEFAULT_COVER_DESIGN,
  photoAnnotationLayout: 'fullWidth',
  photoBrowseLayout: 'fullWidth',
  includeReviewLink: true,
  reportSections: { ...DEFAULT_REPORT_SECTIONS },
  reportSectionOrder: [...DEFAULT_REPORT_SECTION_ORDER],
  icloudAutoBackup: true,
  icloudBackupTipSeen: false,
  lastIcloudBackupAt: null,
  stampDateTime: true,
  stampAddress: true,
  stampShowOnPdf: true,
  measureUnit: 'm',
  lastJobTrade: null,
  appearance: 'system',
};

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

export async function getPreferences(): Promise<AppPreferences> {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  if (!raw) {
    return { ...DEFAULT_PREFERENCES, measureUnit: defaultMeasureUnit() };
  }
  try {
    const stored = JSON.parse(raw) as Partial<AppPreferences>;
    const parsed = { ...DEFAULT_PREFERENCES, ...stored } as AppPreferences;
    parsed.reportTemplate = normalizeReportTemplateId(parsed.reportTemplate);
    parsed.coverDesign = normalizeCoverDesignId(parsed.coverDesign);
    parsed.photoAnnotationLayout = normalizePhotoAnnotationLayout(parsed.photoAnnotationLayout);
    parsed.photoBrowseLayout = normalizePhotoBrowseLayout(parsed.photoBrowseLayout);
    parsed.reportSections = normalizeReportSections(parsed.reportSections);
    parsed.reportSectionOrder = normalizeReportSectionOrder(parsed.reportSectionOrder);
    // Keep the legacy review toggle in sync with the Sections tray until removed.
    if (typeof parsed.includeReviewLink !== 'boolean') {
      parsed.includeReviewLink = parsed.reportSections.review;
    } else if (stored.reportSections == null) {
      parsed.reportSections = { ...parsed.reportSections, review: parsed.includeReviewLink };
    }
    if (typeof parsed.icloudAutoBackup !== 'boolean') parsed.icloudAutoBackup = true;
    if (typeof parsed.icloudBackupTipSeen !== 'boolean') parsed.icloudBackupTipSeen = false;
    if (typeof parsed.lastIcloudBackupAt !== 'string') parsed.lastIcloudBackupAt = null;
    if (typeof parsed.stampDateTime !== 'boolean') parsed.stampDateTime = true;
    if (typeof parsed.stampAddress !== 'boolean') parsed.stampAddress = true;
    if (typeof parsed.stampShowOnPdf !== 'boolean') parsed.stampShowOnPdf = true;
    parsed.measureUnit = normalizeMeasureUnit(parsed.measureUnit);
    if (typeof parsed.lastJobTrade !== 'string') parsed.lastJobTrade = null;
    parsed.appearance = normalizeAppearancePreference(parsed.appearance);
    return parsed;
  } catch {
    return { ...DEFAULT_PREFERENCES, measureUnit: defaultMeasureUnit() };
  }
}

export async function savePreferences(patch: Partial<AppPreferences>): Promise<AppPreferences> {
  const current = await getPreferences();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  return next;
}

export async function clearAllPreferences(): Promise<void> {
  await AsyncStorage.multiRemove([ONBOARDING_KEY, PREFERENCES_KEY]);
}
