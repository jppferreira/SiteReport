import { addressLineFromResult, getAddressApiKey, lookupPostcode } from './postcodeLookup';

describe('getAddressApiKey', () => {
  const prev = process.env.EXPO_PUBLIC_GETADDRESS_API_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.EXPO_PUBLIC_GETADDRESS_API_KEY;
    else process.env.EXPO_PUBLIC_GETADDRESS_API_KEY = prev;
  });

  it('prefers override over env', () => {
    process.env.EXPO_PUBLIC_GETADDRESS_API_KEY = 'env-key';
    expect(getAddressApiKey(' override ')).toBe('override');
  });

  it('falls back to env', () => {
    process.env.EXPO_PUBLIC_GETADDRESS_API_KEY = 'env-key';
    expect(getAddressApiKey(null)).toBe('env-key');
  });
});

describe('lookupPostcode', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    delete process.env.EXPO_PUBLIC_GETADDRESS_API_KEY;
  });

  it('rejects short postcodes', async () => {
    await expect(lookupPostcode('SW1')).resolves.toEqual({ ok: false, error: 'invalid' });
  });

  it('uses getAddress.io when a key is provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        postcode: 'BS6 1AA',
        addresses: [
          {
            line_1: '14 Oak Street',
            town_or_city: 'Bristol',
            county: 'City of Bristol',
          },
        ],
      }),
    });

    const result = await lookupPostcode('bs61aa', 'test-key');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('getaddress');
    expect(result.localityOnly).toBe(false);
    expect(result.addresses[0]?.line1).toBe('14 Oak Street');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('api.getAddress.io/find/');
  });

  it('falls back to postcodes.io without a key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          postcode: 'BS6 1AA',
          admin_district: 'Bristol',
          admin_county: null,
          region: 'South West',
        },
      }),
    });

    const result = await lookupPostcode('BS6 1AA');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('postcodes.io');
    expect(result.localityOnly).toBe(true);
    expect(result.addresses[0]?.town).toBe('Bristol');
  });
});

describe('addressLineFromResult', () => {
  it('joins non-empty parts', () => {
    expect(
      addressLineFromResult({
        line1: '14 Oak Street',
        line2: null,
        town: 'Bristol',
        county: null,
        postcode: 'BS6 1AA',
        label: 'x',
      })
    ).toBe('14 Oak Street, Bristol');
  });
});
