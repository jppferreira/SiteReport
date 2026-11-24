import { alignToAxis, centroid2, lengthMetersBetween, nearestWithin, polygonAreaSquareMeters } from './measureMath';

const at = (x: number, y: number, z: number) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];

describe('measureMath', () => {
  it('measures distance between transforms', () => {
    expect(lengthMetersBetween(at(0, 0, 0), at(0.3, 0.4, 0))).toBeCloseTo(0.5);
  });

  it('computes area for floors and walls alike', () => {
    const floor = [{ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, { x: 3, y: 0, z: 4 }, { x: 0, y: 0, z: 4 }];
    expect(polygonAreaSquareMeters(floor)).toBeCloseTo(12);
    const wall = [{ x: 0, y: 0, z: 1 }, { x: 0.76, y: 0, z: 1 }, { x: 0.76, y: 2.04, z: 1 }, { x: 0, y: 2.04, z: 1 }];
    expect(polygonAreaSquareMeters(wall)).toBeCloseTo(1.5504, 4);
    expect(polygonAreaSquareMeters(wall.slice(0, 2))).toBe(0);
  });

  it('snaps to the nearest point within the radius', () => {
    const points = [{ id: 'a', x: 10, y: 10 }, { id: 'b', x: 100, y: 100 }];
    expect(nearestWithin(points, { x: 95, y: 104 }, 24)?.id).toBe('b');
    expect(nearestWithin(points, { x: 50, y: 50 }, 24)).toBeNull();
  });

  it('lines up near-horizontal and near-vertical segments', () => {
    expect(alignToAxis({ x: 0, y: 0 }, { x: 200, y: 6 })).toEqual({ point: { x: 200, y: 0 }, aligned: 'horizontal' });
    expect(alignToAxis({ x: 0, y: 0 }, { x: 5, y: 300 })).toEqual({ point: { x: 0, y: 300 }, aligned: 'vertical' });
    expect(alignToAxis({ x: 0, y: 0 }, { x: 100, y: 100 }).aligned).toBeNull();
  });

  it('finds the label centroid', () => {
    expect(centroid2([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }, { x: 0, y: 2 }])).toEqual({ x: 2, y: 1 });
  });
});
