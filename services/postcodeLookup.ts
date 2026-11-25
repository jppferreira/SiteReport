/**
 * UK postcode / address lookup.
 *
 * Prefer getAddress.io when `EXPO_PUBLIC_GETADDRESS_API_KEY` (or an override) is set —
 * that returns full street addresses for a postcode. Without a key, falls back to the
 * free postcodes.io API for validation + locality only (no street list).
 */

export type PostcodeAddress = {
  line1: string;
  line2?: string | null;
  line3?: string | null;
  town: string | null;
  county: string | null;
  postcode: string;
  /** Single-line label for pickers. */
  label: string;
};

export type PostcodeLookupResult =
  | { ok: true; source: 'getaddress' | 'postcodes.io'; addresses: PostcodeAddress[]; localityOnly: boolean }
  | { ok: false; error: 'missing_key' | 'invalid' | 'not_found' | 'network' | 'rate_limited' | 'unauthorized' };

function normalizePostcode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ');
}

function compactPostcode(raw: string): string {
  return normalizePostcode(raw).replace(/\s/g, '');
}

export function getAddressApiKey(override?: string | null): string | null {
  const fromOverride = override?.trim();
  if (fromOverride) return fromOverride;
  const fromEnv = process.env.EXPO_PUBLIC_GETADDRESS_API_KEY?.trim();
  return fromEnv || null;
}

function formatLabel(parts: Array<string | null | undefined>): string {
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join(', ');
}

async function lookupGetAddress(postcode: string, apiKey: string): Promise<PostcodeLookupResult> {
  const url = `https://api.getAddress.io/find/${encodeURIComponent(compactPostcode(postcode))}?api-key=${encodeURIComponent(apiKey)}&expand=true`;
  try {
    const res = await fetch(url);
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'unauthorized' };
    if (res.status === 404) return { ok: false, error: 'not_found' };
    if (res.status === 429) return { ok: false, error: 'rate_limited' };
    if (!res.ok) return { ok: false, error: 'network' };
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
    const addresses: PostcodeAddress[] = (json.addresses ?? []).map((row) => {
      const line1 = row.line_1?.trim() || row.formatted_address?.[0]?.trim() || '';
      const line2 = row.line_2?.trim() || null;
      const line3 = [row.line_3, row.line_4].map((x) => x?.trim()).filter(Boolean).join(', ') || null;
      const town = row.town_or_city?.trim() || null;
      const county = row.county?.trim() || null;
      return {
        line1,
        line2,
        line3,
        town,
        county,
        postcode: pc,
        label: formatLabel([line1, line2, line3, town, county, pc]),
      };
    }).filter((a) => a.line1.length > 0);

    if (addresses.length === 0) return { ok: false, error: 'not_found' };
    return { ok: true, source: 'getaddress', addresses, localityOnly: false };
  } catch {
    return { ok: false, error: 'network' };
  }
}

async function lookupPostcodesIo(postcode: string): Promise<PostcodeLookupResult> {
  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(compactPostcode(postcode))}`;
  try {
    const res = await fetch(url);
    if (res.status === 404) return { ok: false, error: 'not_found' };
    if (res.status === 400) return { ok: false, error: 'invalid' };
    if (!res.ok) return { ok: false, error: 'network' };
    const json = (await res.json()) as {
      result?: {
        postcode?: string;
        parish?: string | null;
        admin_district?: string | null;
        admin_county?: string | null;
        region?: string | null;
      };
    };
    const r = json.result;
    if (!r?.postcode) return { ok: false, error: 'not_found' };
    const town = r.admin_district ?? r.parish ?? null;
    const county = r.admin_county ?? r.region ?? null;
    const pc = normalizePostcode(r.postcode);
    return {
      ok: true,
      source: 'postcodes.io',
      localityOnly: true,
      addresses: [
        {
          line1: '',
          town,
          county,
          postcode: pc,
          label: formatLabel([town, county, pc]),
        },
      ],
    };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Looks up addresses for a UK postcode. Pass apiKeyOverride from Settings when set. */
export async function lookupPostcode(
  postcode: string,
  apiKeyOverride?: string | null
): Promise<PostcodeLookupResult> {
  const normalized = normalizePostcode(postcode);
  if (normalized.length < 5) return { ok: false, error: 'invalid' };

  const apiKey = getAddressApiKey(apiKeyOverride);
  if (apiKey) {
    const paid = await lookupGetAddress(normalized, apiKey);
    if (paid.ok || paid.error !== 'unauthorized') return paid;
  }

  return lookupPostcodesIo(normalized);
}

export function addressLineFromResult(address: PostcodeAddress): string {
  return formatLabel([address.line1, address.line2, address.line3, address.town, address.county]);
}
