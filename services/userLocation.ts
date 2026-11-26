import * as Location from 'expo-location';

import { logger } from '@/utils/logger';

const CACHE_MS = 5 * 60 * 1000;
const GPS_TIMEOUT_MS = 4000;

export type UserCoords = { latitude: number; longitude: number };

let cache: { at: number; coords: UserCoords | null } | null = null;

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

/** Best-effort device coordinates for biasing address search. Never throws. */
export async function getUserCoords(): Promise<UserCoords | null> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.coords;

  try {
    const permission = await withTimeout(Location.requestForegroundPermissionsAsync(), GPS_TIMEOUT_MS);
    if (permission.status !== 'granted') {
      cache = { at: now, coords: null };
      return null;
    }

    const lastKnown = await Location.getLastKnownPositionAsync();
    const position =
      lastKnown ??
      (await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        GPS_TIMEOUT_MS
      ));

    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    cache = { at: now, coords };
    return coords;
  } catch (error) {
    logger.debug('User location unavailable for address search', { error: String(error) });
    cache = { at: now, coords: null };
    return null;
  }
}

/** Haversine distance in metres. */
export function distanceMetres(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceLabel(metres: number): string {
  if (metres < 1000) return `${Math.round(metres / 10) * 10} m`;
  if (metres < 10_000) return `${(metres / 1000).toFixed(1)} km`;
  return `${Math.round(metres / 1000)} km`;
}
