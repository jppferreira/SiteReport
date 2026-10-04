import { describe, expect, it } from 'vitest';

import { FREE_REPORT_LIMIT, canGenerateReport } from '@/features/reports/freeLimit';

describe('canGenerateReport', () => {
  it('allows free users below the report limit', () => {
    expect(canGenerateReport(false, FREE_REPORT_LIMIT - 1)).toBe(true);
  });

  it('blocks free users at the report limit', () => {
    expect(canGenerateReport(false, FREE_REPORT_LIMIT)).toBe(false);
  });

  it('allows pro users regardless of count', () => {
    expect(canGenerateReport(true, 999)).toBe(true);
  });
});
