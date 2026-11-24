import { initialMeasureSession, measureSessionReducer as reduce, orphanedAnchors, type MeasureSessionAction, type MeasureSessionState } from './measureSession';

const at = (x: number, y: number, z = 0) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const run = (actions: MeasureSessionAction[], state: MeasureSessionState = initialMeasureSession) => actions.reduce(reduce, state);
const place = (anchorId: string, x: number, y: number, z = 0): MeasureSessionAction => ({ type: 'place', anchorId, transform: at(x, y, z) });

describe('measureSessionReducer', () => {
  it('adds a line between consecutive points', () => {
    const state = run([place('a', 0, 0), place('b', 0.76, 0)]);
    expect(state.measurements).toHaveLength(1);
    expect(state.measurements[0]!).toMatchObject({ kind: 'line', ordinal: 1, pointIds: ['a', 'b'] });
    expect(state.measurements[0]!.value).toBeCloseTo(0.76);
    expect(state.chain).toEqual(['a', 'b']);
  });

  it('closes a doorway outline into an automatic area', () => {
    const state = run([place('a', 0, 0), place('b', 0.76, 0), place('c', 0.76, 2.04), place('d', 0, 2.04), place('a', 0, 0)]);
    const areas = state.measurements.filter((m) => m.kind === 'area');
    expect(areas).toHaveLength(1);
    expect(areas[0]!.value).toBeCloseTo(1.5504, 4);
    expect(state.measurements.filter((m) => m.kind === 'line')).toHaveLength(4);
    expect(state.chain).toEqual([]);
  });

  it('undoes one step at a time, including closing a shape', () => {
    let state = run([place('a', 0, 0), place('b', 1, 0), place('c', 1, 1), place('a', 0, 0)]);
    state = reduce(state, { type: 'undo' });
    expect(state.measurements.some((m) => m.kind === 'area')).toBe(false);
    expect(state.chain).toEqual(['a', 'b', 'c']);
    state = reduce(state, { type: 'undo' });
    expect(state.chain).toEqual(['a', 'b']);
    expect(state.points.c).toBeUndefined();
    expect(state.measurements).toHaveLength(1);
  });

  it('finishes a line and starts a fresh one', () => {
    let state = run([place('a', 0, 0), place('b', 1, 0), { type: 'finish' }, place('c', 5, 5)]);
    expect(state.measurements).toHaveLength(1);
    expect(state.chain).toEqual(['c']);
    state = run([{ type: 'undo' }, { type: 'undo' }], state);
    expect(state.chain).toEqual(['a', 'b']);
  });

  it('renames, edits and removes rows', () => {
    let state = run([place('a', 0, 0), place('b', 2, 0)]);
    const id = state.measurements[0]!.id;
    state = run([{ type: 'rename', id, name: '  Hall door height  ' }, { type: 'setValue', id, value: 2.04 }], state);
    expect(state.measurements[0]!).toMatchObject({ name: 'Hall door height', value: 2.04, source: 'edited' });
    expect(reduce(state, { type: 'setValue', id, value: -1 })).toBe(state);
    state = reduce(state, { type: 'remove', id });
    expect(state.measurements).toHaveLength(0);
  });

  it('keeps edited rows when ARKit refines anchors', () => {
    let state = run([place('a', 0, 0), place('b', 1, 0), { type: 'finish' }, place('c', 0, 0, 1), place('d', 0, 0, 2)]);
    const first = state.measurements[0]!;
    const second = state.measurements[1]!;
    state = reduce(state, { type: 'setValue', id: first.id, value: 1.5 });
    state = reduce(state, { type: 'syncTransforms', transforms: { b: at(1.1, 0), d: at(0, 0, 3) } });
    expect(state.measurements.find((m) => m.id === first.id)?.value).toBe(1.5);
    expect(state.measurements.find((m) => m.id === second.id)?.value).toBeCloseTo(2);
  });

  it('adds typed-in rows and reports orphaned anchors', () => {
    const before = run([place('a', 0, 0), place('b', 1, 0)]);
    const after = reduce(before, { type: 'clear' });
    expect(orphanedAnchors(before, after).sort()).toEqual(['a', 'b']);
    const manual = reduce(after, { type: 'addManual', kind: 'area', name: 'Floor', value: 12.5 });
    expect(manual.measurements[0]!).toMatchObject({ kind: 'area', source: 'manual', value: 12.5, ordinal: 1 });
  });
});
