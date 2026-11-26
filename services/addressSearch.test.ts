import {
  addressLineFromSuggestion,
  formatUkPostcode,
  isCompleteUkPostcode,
  searchAddresses,
} from './addressSearch';

describe('formatUkPostcode / isCompleteUkPostcode', () => {
  it('formats and detects complete UK postcodes', () => {
    expect(formatUkPostcode('bs61aa')).toBe('BS6 1AA');
    expect(isCompleteUkPostcode('bs61aa')).toBe(true);
    expect(isCompleteUkPostcode('BS6 1A')).toBe(false);
    expect(isCompleteUkPostcode('SW1A 1AA')).toBe(true);
  });
});

describe('searchAddresses', () => {
  const fetchMock = jest.fn();
  const prevKey = process.env.EXPO_PUBLIC_GETADDRESS_API_KEY;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
    delete process.env.EXPO_PUBLIC_GETADDRESS_API_KEY;
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.EXPO_PUBLIC_GETADDRESS_API_KEY;
    else process.env.EXPO_PUBLIC_GETADDRESS_API_KEY = prevKey;
  });

  it('returns empty for short queries', async () => {
    await expect(searchAddresses('59')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ranks street matches by distance to the user', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            geometry: { coordinates: [-0.12, 51.5] },
            properties: {
              osm_type: 'N',
              osm_id: 1,
              housenumber: '59',
              street: 'Far Court',
              city: 'London',
              postcode: 'SW1A 1AA',
              countrycode: 'GB',
            },
          },
          {
            geometry: { coordinates: [-2.59, 51.45] },
            properties: {
              osm_type: 'N',
              osm_id: 2,
              housenumber: '59',
              street: 'Lower Court',
              city: 'Bristol',
              postcode: 'BS1 1AA',
              countrycode: 'GB',
            },
          },
          {
            geometry: { coordinates: [-76.78, 39.41] },
            properties: {
              osm_type: 'N',
              osm_id: 3,
              housenumber: '59',
              street: 'Lower Gate Court',
              city: 'Owings Mills',
              countrycode: 'US',
            },
          },
        ],
      }),
    });

    const near = { latitude: 51.4545, longitude: -2.5879 };
    const results = await searchAddresses('59 lower court', near);
    expect(results).toHaveLength(2);
    expect(results[0]?.line1).toBe('59 Lower Court');
    expect(results[0]?.distanceMetres).not.toBeNull();
    expect(results[0]!.distanceMetres!).toBeLessThan(results[1]!.distanceMetres!);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('photon.komoot.io');
  });

  it('uses getAddress.io for a complete postcode when a key is set', async () => {
    process.env.EXPO_PUBLIC_GETADDRESS_API_KEY = 'test-key';
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

    const results = await searchAddresses('bs61aa');
    expect(results).toHaveLength(1);
    expect(results[0]?.line1).toBe('14 Oak Street');
    expect(results[0]?.postcode).toBe('BS6 1AA');
    expect(fetchMock.mock.calls[0]?.[0]).toContain('api.getAddress.io/find/');
  });

  it('falls back to postcodes.io for a postcode when Photon is empty', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            postcode: 'BS6 1AA',
            admin_district: 'Bristol',
            admin_county: null,
            region: 'South West',
            latitude: 51.47,
            longitude: -2.59,
          },
        }),
      });

    const results = await searchAddresses('BS6 1AA');
    expect(results).toHaveLength(1);
    expect(results[0]?.town).toBe('Bristol');
    expect(results[0]?.postcode).toBe('BS6 1AA');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('api.postcodes.io');
  });
});

describe('addressLineFromSuggestion', () => {
  it('joins line parts', () => {
    expect(
      addressLineFromSuggestion({
        id: '1',
        line1: '59 Lower Court',
        town: 'Bristol',
        county: null,
        postcode: 'BS1 1AA',
        label: 'x',
        latitude: 0,
        longitude: 0,
        distanceMetres: null,
        distanceLabel: null,
      })
    ).toBe('59 Lower Court, Bristol');
  });
});
