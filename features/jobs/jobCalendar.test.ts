import { buildMonthGrid, parseIsoDate, shiftMonth, toIsoDate } from './jobCalendar';

describe('parseIsoDate', () => {
  it('reads a calendar date in local time', () => {
    const date = parseIsoDate('2026-10-06');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(6);
  });

  it('rejects dates that do not exist', () => {
    expect(parseIsoDate('2026-02-31')).toBeNull();
    expect(parseIsoDate('06/10/2026')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });
});

describe('buildMonthGrid', () => {
  it('starts October 2026 on the Monday before the 1st', () => {
    const cells = buildMonthGrid(2026, 9);
    expect(cells[0]?.iso).toBe('2026-09-28');
    expect(cells[3]).toEqual({ iso: '2026-10-01', day: 1, inMonth: true });
    expect(cells).toHaveLength(35);
    expect(cells.at(-1)?.iso).toBe('2026-11-01');
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
  });

  it('includes 29 February in a leap year', () => {
    const cells = buildMonthGrid(2024, 1);
    expect(cells.some((cell) => cell.iso === '2024-02-29' && cell.inMonth)).toBe(true);
  });
});

describe('shiftMonth', () => {
  it('rolls January back into the previous year', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('toIsoDate', () => {
  it('round-trips a parsed date', () => {
    expect(toIsoDate(parseIsoDate('2026-10-06')!)).toBe('2026-10-06');
  });
});
