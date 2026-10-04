import { validateEmail, validateJobTitle } from './validation';

describe('validateJobTitle', () => {
  it('rejects an empty title', () => {
    const result = validateJobTitle('   ');
    expect(result.valid).toBe(false);
  });

  it('accepts a normal title', () => {
    expect(validateJobTitle('Bathroom repair')).toEqual({ valid: true });
  });

  it('rejects a title over 120 characters', () => {
    const result = validateJobTitle('a'.repeat(121));
    expect(result.valid).toBe(false);
  });

  it('accepts titles containing emoji and special characters', () => {
    expect(validateJobTitle('Kitchen refit 🔧 — final fix')).toEqual({ valid: true });
  });
});

describe('validateEmail', () => {
  it('allows an empty email since it is optional', () => {
    expect(validateEmail('')).toEqual({ valid: true });
  });

  it('accepts a well formed email', () => {
    expect(validateEmail('james@example.com')).toEqual({ valid: true });
  });

  it('rejects a malformed email', () => {
    expect(validateEmail('not-an-email').valid).toBe(false);
  });
});
