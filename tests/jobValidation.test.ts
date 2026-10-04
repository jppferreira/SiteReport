import { describe, expect, it } from 'vitest';

import { validateJobTitle } from '@/features/jobs/jobValidation';

describe('validateJobTitle', () => {
  it('requires a title', () => {
    expect(validateJobTitle('  ')).toBe('Job title is required');
  });

  it('accepts valid title', () => {
    expect(validateJobTitle('Bathroom repair')).toBeNull();
  });
});
