/**
 * Unified UK address search — street text or postcode.
 * Biases free-text results to the user’s location (Photon / OpenStreetMap).
 * Complete postcodes also try getAddress.io when EXPO_PUBLIC_GETADDRESS_API_KEY is set.
 */

import { distanceMetres, formatDistanceLabel, type UserCoords } from './userLocation';

export type AddressSuggestion = {
  id: string;
  /** House number + street (and name when useful). */
  line1: string;
  town: string | null;
  county: string | null;
  postcode: string | null;
  /** Full picker label. */
  label: string;
  latitude: number | null;
  longitude: number | null;
  distanceMetres: number | null;
  distanceLabel: string | null;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    locality?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
};

function normalizePostcode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ');
}

function compactPostcode(raw: string): string {
  return normalizePostcode(raw).replace(/\s/g, '');
}

/** Formats a UK postcode with the usual space (e.g. BS61AA → BS6 1AA). */
export function formatUkPostcode(raw: string): string {
  const compact = compactPostcode(raw).slice(0, 7);
  if (compact.length <= 3) return compact;
  return `${compact.slice(0, compact.length - 3)} ${compact.slice(-3)}`;
}

/** True when the value looks like a complete UK postcode. */
export function isCompleteUkPostcode(raw: string): boolean {
  const compact = compactPostcode(raw);
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact);
}

function getAddressApiKey(): string | null {
  return process.env.EXPO_PUBLIC_GETADDRESS_API_KEY?.trim() || null;
}

function formatLabel(parts: Array<string | null | undefined>): string {
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join(', ');
}

function formatLine1(props: NonNullable<PhotonFeature['properties']>): string {
  const streetLine = [props.housenumber, props.street].filter(Boolean).join(' ').trim();
  if (streetLine) return streetLine;
  return (props.name ?? '').trim();
}

function formatTown(props: NonNullable<PhotonFeature['properties']>): string | null {
  return props.city || props.locality || props.district || null;
}

function isUkOrIe(code: string | undefined): boolean {
  const c = (code ?? '').toUpperCase();
  return c === 'GB' || c === 'UK' || c === 'IE';
}

function dedupeClosest(rows: AddressSuggestion[], limit = 8): AddressSuggestion[] {
  rows.sort((a, b) => {
    if (a.distanceMetres == null && b.distanceMetres == null) return 0;
    if (a.distanceMetres == null) return 1;
    if (b.distanceMetres == null) return -1;
    return a.distanceMetres - b.distanceMetres;
  });
  const seen = new Set<string>();
  const unique: AddressSuggestion[] = [];
  for (const row of rows) {
    const key = row.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
    if (unique.length >= limit) break;
  }
  return unique;
}

async function searchPhoton(query: string, near?: UserCoords | null): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '12',
    lang: 'en',
  });
  if (near) {
    params.set('lat', String(near.latitude));
    params.set('lon', String(near.longitude));
    params.set('location_bias_scale', '0.6');
  }

  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'TradeReport/1.0 (address-search)',
    },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { features?: PhotonFeature[] };
  const mapped: AddressSuggestion[] = [];

  for (const feature of json.features ?? []) {
    const props = feature.properties;
    const coords = feature.geometry?.coordinates;
    if (!props || !coords || coords.length < 2) continue;
    if (props.countrycode && !isUkOrIe(props.countrycode)) continue;

    const line1 = formatLine1(props);
    if (!line1) continue;

    const longitude = coords[0];
    const latitude = coords[1];
    const town = formatTown(props);
    const county = props.county || props.state || null;
    const postcode = props.postcode?.trim() || null;
    const metres = near ? distanceMetres(near, { latitude, longitude }) : null;

    mapped.push({
      id: `${props.osm_type ?? 'x'}-${props.osm_id ?? `${latitude},${longitude}`}`,
      line1,
      town,
      county,
      postcode,
      label: formatLabel([line1, town, county, postcode]),
      latitude,
      longitude,
      distanceMetres: metres,
      distanceLabel: metres != null ? formatDistanceLabel(metres) : null,
    });
  }

  return dedupeClosest(mapped);
}

async function searchGetAddress(postcode: string, apiKey: string): Promise<AddressSuggestion[]> {
  const url = `https://api.getAddress.io/find/${encodeURIComponent(compactPostcode(postcode))}?api-key=${encodeURIComponent(apiKey)}&expand=true`;
  const res = await fetch(url);
  if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 429 || !res.ok) {
    return [];
  }
  const json = (await res.json()) as {
    postcode?: string;
    addresses?: Array<{
      line_1?: string;
      line_2?: string;
      line_3?: string;
      line_4?: string;
      town_or_city?: string;
      county?: string;
      formatted_address?: string[];
    }>;
  };
  const pc = normalizePostcode(json.postcode ?? postcode);
  const mapped: AddressSuggestion[] = [];
  for (const [index, row] of (json.addresses ?? []).entries()) {
    const line1 = row.line_1?.trim() || row.formatted_address?.[0]?.trim() || '';
    const line2 = row.line_2?.trim() || null;
    const line3 = [row.line_3, row.line_4].map((x) => x?.trim()).filter(Boolean).join(', ') || null;
    const town = row.town_or_city?.trim() || null;
    const county = row.county?.trim() || null;
    if (!line1) continue;
    mapped.push({
      id: `getaddress-${pc}-${index}`,
      line1: formatLabel([line1, line2, line3]),
      town,
      county,
      postcode: pc,
      label: formatLabel([line1, line2, line3, town, county, pc]),
      latitude: null,
      longitude: null,
      distanceMetres: null,
      distanceLabel: null,
    });
  }
  return mapped.slice(0, 12);
}

async function searchPostcodesIo(postcode: string): Promise<AddressSuggestion[]> {
  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(compactPostcode(postcode))}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: {
      postcode?: string;
      parish?: string | null;
      admin_district?: string | null;
      admin_county?: string | null;
      region?: string | null;
      latitude?: number;
      longitude?: number;
    };
  };
  const r = json.result;
  if (!r?.postcode) return [];
  const town = r.admin_district ?? r.parish ?? null;
  const county = r.admin_county ?? r.region ?? null;
  const pc = normalizePostcode(r.postcode);
  return [
    {
      id: `postcodesio-${pc}`,
      line1: '',
      town,
      county,
      postcode: pc,
      label: formatLabel([town, county, pc]),
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      distanceMetres: null,
      distanceLabel: null,
    },
  ];
}

/**
 * Search addresses by street text (e.g. "59 lower court") or UK postcode.
 * When `near` is set, free-text matches closer to the user rank first.
 */
export async function searchAddresses(
  query: string,
  near?: UserCoords | null
): Promise<AddressSuggestion[]> {
  const q = query.trim().replace(/\s+/g, ' ');
  if (q.length < 3) return [];

  try {
    if (isCompleteUkPostcode(q)) {
      const postcode = formatUkPostcode(q);
      const apiKey = getAddressApiKey();
      if (apiKey) {
        const paid = await searchGetAddress(postcode, apiKey);
        if (paid.length > 0) return paid;
      }

      const fromPhoton = await searchPhoton(postcode, near);
      if (fromPhoton.length > 0) return fromPhoton;

      return searchPostcodesIo(postcode);
    }

    return searchPhoton(q, near);
  } catch {
    return [];
  }
}

export function addressLineFromSuggestion(suggestion: AddressSuggestion): string {
  return formatLabel([suggestion.line1, suggestion.town, suggestion.county]);
}
