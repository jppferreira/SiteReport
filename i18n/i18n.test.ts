import { getLocale, resolveDeviceLocale, setLocale, t, SUPPORTED_LOCALES } from './index';

describe('i18n', () => {
  afterEach(() => {
    setLocale('en-US');
  });

  it('ships the European + English locale set', () => {
    expect(SUPPORTED_LOCALES).toEqual([
      'en-US',
      'en-GB',
      'es',
      'fr',
      'de',
      'it',
      'pt',
      'nl',
      'pl',
      'sv',
    ]);
  });

  it('resolves device tags onto shipped catalogs', () => {
    expect(resolveDeviceLocale('en-US')).toBe('en-US');
    expect(resolveDeviceLocale('en-GB')).toBe('en-GB');
    expect(resolveDeviceLocale('es-ES')).toBe('es');
    expect(resolveDeviceLocale('pt-PT')).toBe('pt');
    expect(resolveDeviceLocale('zh-Hans')).toBe('en-US');
  });

  it('translates common keys in English', () => {
    setLocale('en-US');
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('dates.today')).toBe('Today');
    expect(t('jobs.filterA11y', { label: 'All' })).toBe('Filter: All');
  });

  it('switches locale for lookups', () => {
    setLocale('en-GB');
    expect(getLocale()).toBe('en-GB');
    expect(t('common.cancel')).toBeTruthy();
  });
});
