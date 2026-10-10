import type { LocationObject } from 'expo-location';

import { readJson, removeKey, writeJson } from '@/lib/storage/kv';

export const LAST_LOCATION_KEY = 'location:last';
export const METRICS_KEY = 'location:metrics';

export type LocationSource = 'last-known' | 'foreground' | 'background-task';

export type StoredLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: number;
  source: LocationSource;
};

export type LocationMetrics = {
  updates: number;
  firstAt: number | null;
  lastAt: number | null;
};

const EMPTY_METRICS: LocationMetrics = { updates: 0, firstAt: null, lastAt: null };

export function toStoredLocation(position: LocationObject, source: LocationSource): StoredLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    capturedAt: position.timestamp,
    source,
  };
}

export async function readLastLocation(): Promise<StoredLocation | null> {
  return readJson<StoredLocation>(LAST_LOCATION_KEY);
}

export async function saveLastLocation(value: StoredLocation): Promise<void> {
  await writeJson(LAST_LOCATION_KEY, value);
  await countUpdate(value.capturedAt);
}

export async function readMetrics(): Promise<LocationMetrics> {
  return (await readJson<LocationMetrics>(METRICS_KEY)) ?? EMPTY_METRICS;
}

export async function countUpdate(at: number): Promise<LocationMetrics> {
  const current = await readMetrics();
  const next: LocationMetrics = {
    updates: current.updates + 1,
    firstAt: current.firstAt ?? at,
    lastAt: at,
  };
  await writeJson(METRICS_KEY, next);
  return next;
}

export async function clearLocationData(): Promise<void> {
  await removeKey(LAST_LOCATION_KEY);
  await removeKey(METRICS_KEY);
}
