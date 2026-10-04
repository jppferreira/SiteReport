import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'sitereport.onboardingComplete';
const PREFERENCES_KEY = 'sitereport.preferences';

export type PhotoQuality = 'standard' | 'high';

export type AppPreferences = {
  defaultPhotoQuality: PhotoQuality;
  includeSignatureByDefault: boolean;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  defaultPhotoQuality: 'standard',
  includeSignatureByDefault: true,
};

export async function hasCompletedOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export async function getPreferences(): Promise<AppPreferences> {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
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
