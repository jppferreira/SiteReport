import { formatLength, measurementCaption } from './formatLength';

describe('formatLength', () => {
  it('formats metric lengths', () => {
    expect(formatLength(0.452, 'metric')).toBe('45.2 cm');
    expect(formatLength(1.24, 'metric')).toBe('1.24 m');
  });

  it('formats imperial lengths', () => {
    expect(formatLength(0.0254, 'imperial')).toBe('1.0 in');
    expect(formatLength(1.2192, 'imperial')).toMatch(/^4 ft/);
  });

  it('builds captions', () => {
    expect(measurementCaption(1.24, 'metric', 'window')).toBe('1.24 m — window');
    expect(measurementCaption(1.24, 'metric', '  ')).toBe('1.24 m');
  });
});
