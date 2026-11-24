import { degToMmPerM, degToPercent, fallRatio, formatRatio, formatSlope, mmPerMToDeg, normaliseLevelUnit } from './levelUnits';

describe('level units', () => {
  it('converts a 1:40 fall', () => {
    const deg = mmPerMToDeg(25);
    expect(degToMmPerM(deg)).toBeCloseTo(25, 6);
    expect(degToPercent(deg)).toBeCloseTo(2.5, 6);
    expect(fallRatio(deg)).toBe(40);
    expect(formatRatio(deg)).toBe('1:40');
  });

  it('formats every unit unsigned', () => {
    expect(formatSlope(-1.2, 'deg')).toBe('1.2°');
    expect(formatSlope(mmPerMToDeg(21), 'mmPerM')).toBe('21 mm/m');
    expect(formatSlope(mmPerMToDeg(21), 'pct')).toBe('2.1%');
    expect(formatRatio(mmPerMToDeg(21))).toBe('1:48');
  });

  it('has no ratio when level', () => {
    expect(fallRatio(0)).toBeNull();
    expect(formatRatio(0.01)).toBeNull();
  });

  it('normalises stored units', () => {
    expect(normaliseLevelUnit('pct')).toBe('pct');
    expect(normaliseLevelUnit('nonsense')).toBe('deg');
  });
});
