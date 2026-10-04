import { databaseService } from '@/services/databaseService';

export type AppPreferences = {
  onboardingCompleted: boolean;
  defaultPhotoQuality: 'balanced' | 'high';
  includeSignatureByDefault: boolean;
};

const SETTINGS_KEYS = {
  onboardingCompleted: 'onboarding_completed',
  defaultPhotoQuality: 'default_photo_quality',
  includeSignatureByDefault: 'include_signature_by_default',
} as const;

const defaults: AppPreferences = {
  onboardingCompleted: false,
  defaultPhotoQuality: 'balanced',
  includeSignatureByDefault: true,
};

export const settingsService = {
  async getPreferences(): Promise<AppPreferences> {
    const [onboardingCompleted, defaultPhotoQuality, includeSignatureByDefault] = await Promise.all([
      databaseService.getSetting(SETTINGS_KEYS.onboardingCompleted),
      databaseService.getSetting(SETTINGS_KEYS.defaultPhotoQuality),
      databaseService.getSetting(SETTINGS_KEYS.includeSignatureByDefault),
    ]);

    return {
      onboardingCompleted: onboardingCompleted === 'true' ? true : defaults.onboardingCompleted,
      defaultPhotoQuality:
        defaultPhotoQuality === 'high' || defaultPhotoQuality === 'balanced'
          ? defaultPhotoQuality
          : defaults.defaultPhotoQuality,
      includeSignatureByDefault:
        includeSignatureByDefault === null ? defaults.includeSignatureByDefault : includeSignatureByDefault === 'true',
    };
  },

  async completeOnboarding() {
    await databaseService.setSetting(SETTINGS_KEYS.onboardingCompleted, 'true');
  },

  async updatePreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) {
    await databaseService.setSetting(SETTINGS_KEYS[key], String(value));
  },
};
