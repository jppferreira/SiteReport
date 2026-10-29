import { buildReportFileName, normalizeReportFileName, reportFileStem, sanitizeForFileName } from './fileNaming';

describe('sanitizeForFileName', () => {
  it('replaces spaces with hyphens', () => {
    expect(sanitizeForFileName('Bathroom Repair')).toBe('Bathroom-Repair');
  });

  it('strips special characters and transliterates accents to their base letter', () => {
    expect(sanitizeForFileName("Café — Déjà vu!")).toBe('Cafe-Deja-vu');
  });

  it('strips emoji entirely', () => {
    expect(sanitizeForFileName('Kitchen 🔧 refit')).toBe('Kitchen-refit');
  });

  it('falls back to a default when nothing printable remains', () => {
    expect(sanitizeForFileName('🔧🔧🔧')).toBe('Job-Report');
  });
});

describe('buildReportFileName', () => {
  it('combines job title, customer and date into a safe pdf filename', () => {
    const name = buildReportFileName('Bathroom repair', 'James Wilson', '2026-10-04');
    expect(name).toBe('Bathroom-repair-James-Wilson-2026-10-04.pdf');
  });

  it('handles a missing customer name', () => {
    const name = buildReportFileName('Bathroom repair', null, '2026-10-04');
    expect(name).toBe('Bathroom-repair-2026-10-04.pdf');
  });

  it('handles a very long customer name by truncating safely', () => {
    const longName = 'A'.repeat(200);
    const name = buildReportFileName('Job', longName, '2026-10-04');
    expect(name.length).toBeLessThanOrEqual(90);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});

describe('normalizeReportFileName', () => {
  it('keeps spaces and adds the pdf extension', () => {
    expect(normalizeReportFileName('Kitchen refit Wilson')).toBe('Kitchen refit Wilson.pdf');
  });

  it('does not double the extension when the user types one', () => {
    expect(normalizeReportFileName('Kitchen refit.pdf')).toBe('Kitchen refit.pdf');
    expect(normalizeReportFileName('Preview.html', 'html')).toBe('Preview.html');
  });

  it('strips characters that break a file name', () => {
    expect(normalizeReportFileName('Quote: kitchen/bath?')).toBe('Quote kitchen bath.pdf');
  });

  it('returns null when nothing usable remains', () => {
    expect(normalizeReportFileName('   ')).toBeNull();
    expect(normalizeReportFileName('???')).toBeNull();
  });

  it('reads the stem without the extension', () => {
    expect(reportFileStem('Kitchen refit.pdf')).toBe('Kitchen refit');
  });
});
