import type { EntitlementType } from '@/models/domain';

export const resolveEntitlementType = (hasLifetime: boolean, hasSubscription: boolean): EntitlementType => {
  if (hasLifetime) return 'lifetime';
  if (hasSubscription) return 'subscription';
  return 'none';
};
