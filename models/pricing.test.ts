import {
  formatPence,
  linesForReport,
  parseAmountToPence,
  parsePricing,
  pricingTotalPence,
  sanitizeAmountInput,
  serializePricing,
} from './pricing';

describe('pricing reference', () => {
  it('keeps a typed amount to two decimal places', () => {
    expect(sanitizeAmountInput('£1,240.509')).toBe('1240.50');
    expect(sanitizeAmountInput('12.')).toBe('12.');
    expect(parseAmountToPence('12.')).toBe(1200);
    expect(parseAmountToPence('')).toBeNull();
    expect(parseAmountToPence('abc')).toBeNull();
  });

  it('formats a total in pounds', () => {
    expect(formatPence(124050)).toBe('£1,240.50');
    expect(
      pricingTotalPence([
        { id: 'a', description: 'Tiles', category: 'materials', amount: '80' },
        { id: 'b', description: 'Fitting', category: 'labour', amount: '120.50' },
        { id: 'c', description: 'Blank', category: 'other', amount: '' },
      ])
    ).toBe(20050);
  });

  it('hides lines unless pricing is included and the row has something to show', () => {
    const pricing = parsePricing({
      enabled: false,
      lines: [{ id: 'a', description: 'Tiles', category: 'materials', amount: '80' }],
    });
    expect(linesForReport(pricing)).toEqual([]);
    expect(linesForReport({ ...pricing, enabled: true })).toHaveLength(1);
    expect(
      linesForReport({
        enabled: true,
        lines: [{ id: 'b', description: '   ', category: 'labour', amount: '' }],
      })
    ).toEqual([]);
  });

  it('drops a broken saved value instead of failing the job', () => {
    expect(parsePricing('not json')).toEqual({ enabled: false, lines: [] });
    expect(parsePricing(null)).toEqual({ enabled: false, lines: [] });
    const stored = serializePricing(
      parsePricing({
        enabled: true,
        lines: [{ id: 'a', description: 'Grout', category: 'nope', amount: '12.5' }],
      })
    );
    expect(parsePricing(stored).lines[0]).toMatchObject({
      description: 'Grout',
      category: 'other',
      amount: '12.5',
    });
  });
});
