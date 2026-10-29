import { isWholeJobArea, normalizeAreaName, WHOLE_JOB_AREA_ID } from './photoArea';

describe('normalizeAreaName', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeAreaName('  Kitchen   diner  ')).toBe('Kitchen diner');
  });

  it('limits the name to 40 characters', () => {
    expect(normalizeAreaName('a'.repeat(50))).toHaveLength(40);
  });

  it('rejects a blank name', () => {
    expect(normalizeAreaName('   ')).toBe('');
  });
});

describe('isWholeJobArea', () => {
  it('recognises the route id for photos that cover the whole job', () => {
    expect(isWholeJobArea(WHOLE_JOB_AREA_ID)).toBe(true);
    expect(isWholeJobArea('kitchen')).toBe(false);
  });
});
