import type { OnDeviceAIAvailability, ProfessionalRewriteResult } from '../types';
import type { OnDeviceAIService } from './types';

export function createUnavailableAdapter(reason: string): OnDeviceAIService {
  return {
    async getAvailability(): Promise<OnDeviceAIAvailability> {
      return { status: 'unavailable', reason };
    },
    async rewrite(): Promise<ProfessionalRewriteResult> {
      throw new Error(reason);
    },
  };
}
