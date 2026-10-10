import * as Location from 'expo-location';

import { readLastLocation, saveLastLocation, toStoredLocation, type StoredLocation } from '@/lib/location/store';

export const BALANCED_ACCURACY = Location.Accuracy.Balanced;
export const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
export const LAST_KNOWN_REQUIRED_ACCURACY_M = 1000;
export const FRESH_FIX_MIN_GAP_MS = 5 * 60 * 1000;

export type FixOptions = { force?: boolean };

export async function getDonorFix(options?: FixOptions): Promise<StoredLocation | null> {
  let cached: StoredLocation | null = null;
  try {
    cached = await readLastLocation();
  } catch (error) {
    console.warn('[location] reading cached location failed', error);
  }

  // 1) Cheapest path: a recent enough cached fix never touches the radio.
  if (!options?.force && cached && Date.now() - cached.capturedAt < FRESH_FIX_MIN_GAP_MS) {
    return cached;
  }

  try {
    // 2) OS cache, no radio. Resolves null (not a throw) when maxAge/requiredAccuracy are not met.
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
    });
    // A position no newer than our own cache is not a new update: storing it would only inflate the metrics.
    if (lastKnown !== null && (cached === null || lastKnown.timestamp > cached.capturedAt)) {
      const stored = toStoredLocation(lastKnown, 'last-known');
      await saveLastLocation(stored);
      return stored;
    }

    // 3) Last resort: a real fix, at Balanced accuracy so GPS is not forced on.
    const current = await Location.getCurrentPositionAsync({ accuracy: BALANCED_ACCURACY });
    const stored = toStoredLocation(current, 'foreground');
    await saveLastLocation(stored);
    return stored;
  } catch (error) {
    // 5) Permission revoked, services off, no fix: fall back to the cache, never throw to the caller.
    console.warn('[location] getDonorFix failed', error);
    return cached;
  }
}
