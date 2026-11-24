import { formatArea, formatLength, measurementCaption, normaliseMeasureUnit, parseArea, parseLength } from './formatLength';

describe('formatLength', () => {
  it('formats each unit', () => {
    expect(formatLength(0.76, 'm')).toBe('0.76 m');
    expect(formatLength(0.762, 'cm')).toBe('76.2 cm');
    expect(formatLength(0.7624, 'mm')).toBe('762 mm');
    expect(formatLength(0.0254, 'ftIn')).toBe('1.0 in');
    expect(formatLength(1.2192, 'ftIn')).toBe('4 ft');
    expect(formatLength(2.04, 'ftIn')).toBe('6 ft 8.3 in');
  });

  it('formats areas', () => {
    expect(formatArea(1.5504, 'm')).toBe('1.55 m²');
    expect(formatArea(1.5504, 'cm')).toBe('1.55 m²');
    expect(formatArea(1, 'ftIn')).toBe('10.8 ft²');
  });

  it('migrates the old metric / imperial preference', () => {
    expect(normaliseMeasureUnit('metric')).toBe('m');
    expect(normaliseMeasureUnit('imperial')).toBe('ftIn');
    expect(normaliseMeasureUnit('mm')).toBe('mm');
  });

  it('builds captions', () => {
    expect(measurementCaption(1.24, 'm', 'window')).toBe('1.24 m — window');
    expect(measurementCaption(1.24, 'm', '  ')).toBe('1.24 m');
  });
});

describe('parseLength', () => {
  it('reads bare numbers in the current unit', () => {
    expect(parseLength('2.04', 'm')).toBeCloseTo(2.04);
    expect(parseLength('76', 'cm')).toBeCloseTo(0.76);
    expect(parseLength('762', 'mm')).toBeCloseTo(0.762);
    expect(parseLength('80', 'ftIn')).toBeCloseTo(2.032);
    expect(parseLength('2,04', 'm')).toBeCloseTo(2.04);
  });

  it('honours typed suffixes and feet-inches', () => {
    expect(parseLength('204 cm', 'm')).toBeCloseTo(2.04);
    expect(parseLength('6\' 8"', 'm')).toBeCloseTo(2.032);
    expect(parseLength('6ft 8in', 'cm')).toBeCloseTo(2.032);
    expect(parseLength('6′8″', 'm')).toBeCloseTo(2.032);
  });

  it('rejects junk and zero', () => {
    expect(parseLength('', 'm')).toBeNull();
    expect(parseLength('abc', 'm')).toBeNull();
    expect(parseLength('0', 'm')).toBeNull();
  });

  it('parses areas', () => {
    expect(parseArea('1.55', 'm')).toBeCloseTo(1.55);
    expect(parseArea('10.76 sq ft', 'm')).toBeCloseTo(1, 2);
    expect(parseArea('x', 'm')).toBeNull();
  });
});
