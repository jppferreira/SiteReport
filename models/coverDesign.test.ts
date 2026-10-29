import { coverDesignLabel, normalizeCoverDesignId } from './coverDesign';

describe('cover designs', () => {
  it('keeps the editorial cover when the saved value is missing or unknown', () => {
    expect(normalizeCoverDesignId(undefined)).toBe('editorial');
    expect(normalizeCoverDesignId('nope')).toBe('editorial');
    expect(normalizeCoverDesignId('poster')).toBe('poster');
  });

  it('names the designs shown in branding', () => {
    expect(coverDesignLabel('bleed')).toBe('Photo');
    expect(coverDesignLabel('split')).toBe('Split');
  });
});
