import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

import { logger } from '@/utils/logger';

const FIRST_SHARE_REVIEW_PROMPTED_KEY = 'sitereport.firstShareReviewPrompted';

/**
 * Checks if the user has already been prompted to review after their first PDF share.
 */
export async function hasPromptedForFirstShareReview(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(FIRST_SHARE_REVIEW_PROMPTED_KEY);
    return value === 'true';
  } catch (error) {
    logger.warn('Failed to read first share review prompt state', { error: String(error) });
    return false;
  }
}

/**
 * Marks that the user has been prompted to review after their first PDF share.
 */
async function markFirstShareReviewPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_SHARE_REVIEW_PROMPTED_KEY, 'true');
  } catch (error) {
    logger.warn('Failed to save first share review prompt state', { error: String(error) });
  }
}

/**
 * Request an in-app review prompt after the first successful PDF share.
 * This should be called with a slight delay (1-1.5s) after the share completes.
 * 
 * @returns `true` if the prompt was shown or attempted, `false` if already prompted before or unavailable
 */
export async function requestFirstShareReview(): Promise<boolean> {
  try {
    const alreadyPrompted = await hasPromptedForFirstShareReview();
    if (alreadyPrompted) {
      return false;
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      logger.info('Store review is not available on this platform');
      return false;
    }

    const hasAction = await StoreReview.hasAction();
    if (!hasAction) {
      logger.info('Store review has no action available');
      return false;
    }

    await markFirstShareReviewPrompted();
    await StoreReview.requestReview();
    logger.info('Requested in-app review after first PDF share');
    return true;
  } catch (error) {
    logger.warn('Failed to request in-app review', { error: String(error) });
    return false;
  }
}

/**
 * Resets the first share review prompt state (useful for testing).
 */
export async function resetFirstShareReviewPrompt(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FIRST_SHARE_REVIEW_PROMPTED_KEY);
  } catch (error) {
    logger.warn('Failed to reset first share review prompt state', { error: String(error) });
  }
}
