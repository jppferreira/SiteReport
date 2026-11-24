import * as Location from 'expo-location';

import { logger } from '@/utils/logger';

const CACHE_MS = 5 * 60 * 1000;
/** GPS must not block report preview / PDF forever when the fix is slow. */
const GPS_TIMEOUT_MS = 4000;

let cache: { at: number; label: string | null } | null = null;

function formatPlace(place: Location.LocationGeocodedAddress): string | null {
  const line1 = [place.streetNumber, place.street].filter(Boolean).join(' ').trim();
  const line2 = [place.postalCode, place.city || place.subregion].filter(Boolean).join(' ').trim();
  const parts = [line1 || place.name, line2].filter((part) => part && part.length > 0);
  if (parts.length === 0) return null;
  return parts.join(', ');
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
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
    const permission = await withTimeout(Location.requestForegroundPermissionsAsync(), GPS_TIMEOUT_MS);
    if (permission.status !== 'granted') {
      cache = { at: now, label: null };
      return fallbackLabel;
    }

    // Prefer a cached fix so report preview does not wait on a fresh GPS lock.
    const lastKnown = await Location.getLastKnownPositionAsync();
    const position =
      lastKnown ??
      (await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        GPS_TIMEOUT_MS
      ));

    const places = await withTimeout(
      Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      GPS_TIMEOUT_MS
    );
    const label = places[0] ? formatPlace(places[0]) : null;
    cache = { at: now, label };
    return label || fallbackLabel;
  } catch (error) {
    logger.debug('Stamp location unavailable', { error: String(error) });
    cache = { at: now, label: null };
    return fallbackLabel;
  }
}
