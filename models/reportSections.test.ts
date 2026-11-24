import {
  DEFAULT_REPORT_SECTION_ORDER,
  DEFAULT_REPORT_SECTIONS,
  normalizeReportSectionOrder,
  normalizeReportSections,
  templateMatchesTradeFilter,
} from './reportSections';

describe('reportSections', () => {
  it('fills missing section flags with defaults', () => {
    expect(normalizeReportSections({ photos: false })).toEqual({
      ...DEFAULT_REPORT_SECTIONS,
      photos: false,
    });
  });

  it('repairs incomplete section order', () => {
    expect(normalizeReportSectionOrder(['review', 'photos', 'review', 'nope'])).toEqual([
      'review',
      'photos',
      'cover',
      'checklist',
      'costs',
      'signature',
    ]);
  });

  it('keeps the default order when input is empty', () => {
    expect(normalizeReportSectionOrder(null)).toEqual(DEFAULT_REPORT_SECTION_ORDER);
  });

  it('filters templates by trade', () => {
    expect(templateMatchesTradeFilter('thermal', 'plumbing')).toBe(true);
    expect(templateMatchesTradeFilter('circuit', 'plumbing')).toBe(false);
    expect(templateMatchesTradeFilter('studio', 'kitchens')).toBe(true);
    expect(templateMatchesTradeFilter('modern', 'all')).toBe(true);
  });
});
