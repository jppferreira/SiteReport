import { describe, expect, it } from 'vitest';

import { resolveEntitlementType } from '@/features/purchases/entitlement';

describe('resolveEntitlementType', () => {
  it('prioritises lifetime over subscription', () => {
    expect(resolveEntitlementType(true, true)).toBe('lifetime');
  });

  it('returns subscription state', () => {
    expect(resolveEntitlementType(false, true)).toBe('subscription');
  });

  it('returns none with no purchase', () => {
    expect(resolveEntitlementType(false, false)).toBe('none');
  });
});
