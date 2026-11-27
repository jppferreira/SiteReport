import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

import {
  hasPromptedForFirstShareReview,
  requestFirstShareReview,
  resetFirstShareReviewPrompt,
} from './appReviewService';

jest.mock('expo-store-review');
jest.mock('@react-native-async-storage/async-storage');

const mockStoreReview = StoreReview as jest.Mocked<typeof StoreReview>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('appReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPromptedForFirstShareReview', () => {
    it('returns false when no value is stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const result = await hasPromptedForFirstShareReview();
      expect(result).toBe(false);
    });

    it('returns true when prompted before', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('true');
      const result = await hasPromptedForFirstShareReview();
      expect(result).toBe(true);
    });

    it('returns false on storage error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const result = await hasPromptedForFirstShareReview();
      expect(result).toBe(false);
    });
  });

  describe('requestFirstShareReview', () => {
    it('requests review on first share', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockStoreReview.isAvailableAsync.mockResolvedValue(true);
      mockStoreReview.hasAction.mockResolvedValue(true);
      mockStoreReview.requestReview.mockResolvedValue();

      const result = await requestFirstShareReview();

      expect(result).toBe(true);
      expect(mockStoreReview.requestReview).toHaveBeenCalledTimes(1);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'sitereport.firstShareReviewPrompted',
        'true'
      );
    });

    it('does not request review if already prompted', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('true');

      const result = await requestFirstShareReview();

      expect(result).toBe(false);
      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });

    it('does not request review if unavailable', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockStoreReview.isAvailableAsync.mockResolvedValue(false);

      const result = await requestFirstShareReview();

      expect(result).toBe(false);
      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });

    it('does not request review if no action available', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockStoreReview.isAvailableAsync.mockResolvedValue(true);
      mockStoreReview.hasAction.mockResolvedValue(false);

      const result = await requestFirstShareReview();

      expect(result).toBe(false);
      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockStoreReview.isAvailableAsync.mockRejectedValue(new Error('API error'));

      const result = await requestFirstShareReview();

      expect(result).toBe(false);
      expect(mockStoreReview.requestReview).not.toHaveBeenCalled();
    });
  });

  describe('resetFirstShareReviewPrompt', () => {
    it('removes the stored flag', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue();

      await resetFirstShareReviewPrompt();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        'sitereport.firstShareReviewPrompted'
      );
    });

    it('handles errors gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(resetFirstShareReviewPrompt()).resolves.not.toThrow();
    });
  });
});
