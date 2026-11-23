import * as Location from 'expo-location';

import { logger } from '@/utils/logger';

const CACHE_MS = 5 * 60 * 1000;

let cache: { at: number; label: string | null } | null = null;

function formatPlace(place: Location.LocationGeocodedAddress): string | null {
  const line1 = [place.streetNumber, place.street].filter(Boolean).join(' ').trim();
  const line2 = [place.postalCode, place.city || place.subregion].filter(Boolean).join(' ').trim();
  const parts = [line1 || place.name, line2].filter((part) => part && part.length > 0);
  if (parts.length === 0) return null;
  return parts.join(', ');
}

/**
 * Best-effort GPS label for the evidence stamp. Falls back to the job address
 * when permission is denied, GPS is unavailable, or reverse geocode fails.
 */
export async function resolveStampAddress(fallback: string | null | undefined): Promise<string | null> {
  const fallbackLabel = fallback?.trim() || null;
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return cache.label || fallbackLabel;
  }

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      cache = { at: now, label: null };
      return fallbackLabel;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const places = await Location.reverseGeocodeAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    const label = places[0] ? formatPlace(places[0]) : null;
    cache = { at: now, label };
    return label || fallbackLabel;
  } catch (error) {
    logger.debug('Stamp location unavailable', { error: String(error) });
    cache = { at: now, label: null };
    return fallbackLabel;
  }
}
