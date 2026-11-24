import { calibratedReading, calibrationFor, parseCalibration } from './levelCalibration';
import { levelDirection } from './levelDirection';
import { normaliseGravity, readingFromAcceleration, smoothGravity } from './levelMath';
import { parseLevelSettings } from './useLevelSettings';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

describe('per-orientation zero', () => {
  it('zeroes flat roll and pitch', () => {
    const g = { x: 0.03, y: -0.02, z: -1 };
    const raw = readingFromAcceleration(g.x, g.y, g.z);
    const offsets = { flat: calibrationFor('flat', raw, g) };
    const reading = calibratedReading('flat', raw, g, offsets);
    expect(reading.tiltDeg).toBeCloseTo(0, 6);
    expect(reading.isLevel).toBe(true);
  });

  it('keeps each edge as its own datum', () => {
    const g = { x: -1, y: 0.03, z: 0 };
    const raw = readingFromAcceleration(g.x, g.y, g.z);
    const offsets = { edgeLeft: calibrationFor('edgeLeft', raw, g) };
    expect(calibratedReading('edgeLeft', raw, g, offsets).angleDeg).toBeCloseTo(0, 6);
    const right = { x: 1, y: 0.03, z: 0 };
    expect(calibratedReading('edgeRight', readingFromAcceleration(1, 0.03, 0), right, offsets).angleDeg).not.toBeCloseTo(0, 1);
  });

  it('drops corrupt stored offsets', () => {
    expect(parseCalibration({ flat: { a: Number.NaN, b: 0 }, edgeLeft: { a: 1, b: 0 }, nope: { a: 1, b: 1 } })).toEqual({ edgeLeft: { a: 1, b: 0 } });
    expect(parseLevelSettings('{bad json')).toMatchObject({ unit: 'deg', haptics: true, sound: false });
  });
});

describe('gravity helpers', () => {
  it('flips Android readings onto CoreMotion axes', () => {
    expect(normaliseGravity({ x: 0.1, y: 0, z: 1 }, 'android')).toEqual({ x: -0.1, y: -0, z: -1 });
    expect(normaliseGravity({ x: 0.1, y: 0, z: -1 }, 'ios')).toEqual({ x: 0.1, y: 0, z: -1 });
    expect(normaliseGravity({ x: Number.NaN, y: 0, z: -1 }, 'ios')).toBeNull();
    expect(normaliseGravity({ x: 0, y: 0, z: 0 }, 'ios')).toBeNull();
  });

  it('smooths the vector', () => {
    expect(smoothGravity({ x: 0, y: 0, z: -1 }, { x: 1, y: 0, z: -1 }, 0.5).x).toBeCloseTo(0.5);
  });
});

describe('levelDirection', () => {
  it('names the low side to raise', () => {
    expect(levelDirection('flat', { rollDeg: 2, pitchDeg: 0.5, angleDeg: 2, isLevel: false })).toBe('raiseRight');
    expect(levelDirection('flat', { rollDeg: -2, pitchDeg: 0.5, angleDeg: 2, isLevel: false })).toBe('raiseLeft');
    expect(levelDirection('flat', { rollDeg: 0.2, pitchDeg: 3, angleDeg: 3, isLevel: false })).toBe('raiseTop');
    expect(levelDirection('edgeLeft', { rollDeg: 1.2, pitchDeg: 0, angleDeg: 1.2, isLevel: false })).toBe('raiseLeftEnd');
    expect(levelDirection('edgeRight', { rollDeg: -1.2, pitchDeg: 0, angleDeg: -1.2, isLevel: false })).toBe('raiseRightEnd');
    expect(levelDirection('plumbBottom', { rollDeg: 0, pitchDeg: 0, angleDeg: 0, isLevel: true })).toBe('plumb');
  });
});
