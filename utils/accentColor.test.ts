import { accentSwatchInk, customAccentError, isPresetAccent, parseAccentHex } from './accentColor';

describe('parseAccentHex', () => {
  it('accepts a 6-digit hex and canonicalises it', () => {
    expect(parseAccentHex('#1fa84a')).toBe('#1FA84A');
    expect(parseAccentHex('  0ea5e9  ')).toBe('#0EA5E9');
  });

  it('rejects values the report renderer would drop', () => {
    expect(parseAccentHex('')).toBeNull();
    expect(parseAccentHex('#FFF')).toBeNull();
    expect(parseAccentHex('#1FA84A88')).toBeNull();
    expect(parseAccentHex('red')).toBeNull();
    expect(parseAccentHex('#GGGGGG')).toBeNull();
  });
});

describe('isPresetAccent', () => {
  it('matches presets regardless of case or a missing hash', () => {
    expect(isPresetAccent('#1fa84a')).toBe(true);
    expect(isPresetAccent('101310')).toBe(true);
  });

  it('treats any other valid hex as custom', () => {
    expect(isPresetAccent('#C45C26')).toBe(false);
    expect(isPresetAccent('nope')).toBe(false);
  });
});

describe('customAccentError', () => {
  it('stays quiet while a colour is still being typed', () => {
    expect(customAccentError('#C4', false)).toBeNull();
    expect(customAccentError('', false)).toBeNull();
  });

  it('reports a finished value that is not #RRGGBB', () => {
    expect(customAccentError('#GGGGGG', false)).toBe('Use a 6-digit hex colour, like #1FA84A.');
    expect(customAccentError('#FFF', true)).toBe('Use a 6-digit hex colour, like #1FA84A.');
    expect(customAccentError('#C45C26', true)).toBeNull();
  });
});

describe('accentSwatchInk', () => {
  it('uses dark ink on light colours and white ink on dark ones', () => {
    expect(accentSwatchInk('#FFFFFF')).toBe('#121412');
    expect(accentSwatchInk('#101310')).toBe('#FFFFFF');
    expect(accentSwatchInk('#C45C26')).toBe('#FFFFFF');
  });
});
