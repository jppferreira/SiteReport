import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CoverDesignId,
  DEFAULT_COVER_DESIGN,
  DEFAULT_REPORT_TEMPLATE,
  normalizeCoverDesignId,
  normalizeReportTemplateId,
  ReportTemplateId,
} from '@/models';

const ONBOARDING_KEY = 'sitereport.onboardingComplete';
const PREFERENCES_KEY = 'sitereport.preferences';

export type PhotoQuality = 'standard' | 'high';

export type AppPreferences = {
  defaultPhotoQuality: PhotoQuality;
  includeSignatureByDefault: boolean;
  reportTemplate: ReportTemplateId;
  coverDesign: CoverDesignId;
  /** Copies the backup zip into iCloud Drive on iPhone. On until the user turns it off. */
  icloudAutoBackup: boolean;
  /** The one-time note about where that zip lives in the Files app. */
  icloudBackupTipSeen: boolean;
  lastIcloudBackupAt: string | null;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  defaultPhotoQuality: 'standard',
  includeSignatureByDefault: true,
  reportTemplate: DEFAULT_REPORT_TEMPLATE,
  coverDesign: DEFAULT_COVER_DESIGN,
  icloudAutoBackup: true,
  icloudBackupTipSeen: false,
  lastIcloudBackupAt: null,
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
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } as AppPreferences;
    parsed.reportTemplate = normalizeReportTemplateId(parsed.reportTemplate);
    parsed.coverDesign = normalizeCoverDesignId(parsed.coverDesign);
    if (typeof parsed.icloudAutoBackup !== 'boolean') parsed.icloudAutoBackup = true;
    if (typeof parsed.icloudBackupTipSeen !== 'boolean') parsed.icloudBackupTipSeen = false;
    if (typeof parsed.lastIcloudBackupAt !== 'string') parsed.lastIcloudBackupAt = null;
    return parsed;
  } catch {
    return DEFAULT_PREFERENCES;
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
