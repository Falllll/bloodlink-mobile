import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { BALANCED_ACCURACY } from '@/lib/location/fix';
import { saveLastLocation, toStoredLocation } from '@/lib/location/store';

export const LOCATION_TASK_NAME = 'bloodlink-donor-location';

type LocationTaskData = { locations: LocationObject[] };

export const BACKGROUND_OPTIONS: Location.LocationTaskOptions = {
  accuracy: BALANCED_ACCURACY,
  distanceInterval: 500,
  timeInterval: 15 * 60 * 1000,
  deferredUpdatesInterval: 15 * 60 * 1000,
  deferredUpdatesDistance: 500,
  pausesUpdatesAutomatically: true,
  showsBackgroundLocationIndicator: false,
  activityType: Location.ActivityType.Other,
  foregroundService: {
    notificationTitle: 'BloodLink',
    notificationBody: 'Memantau lokasi agar panggilan donor terdekat bisa sampai.',
    killServiceOnDestroy: true,
  },
};

// Module scope, BUKAN di dalam komponen: OS membangunkan bundle ini tanpa me-render view apa pun.
TaskManager.defineTask<LocationTaskData>(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error !== null) {
    console.warn('[location] background task error', error.code, error.message);
    return;
  }
  const last = data?.locations?.at(-1);
  if (!last) return;
  // Local cache only: no network call from the background task.
  await saveLastLocation(toStoredLocation(last, 'background-task'));
});

export async function isBackgroundTrackingOn(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function startBackgroundTracking(): Promise<boolean> {
  const background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted) return false;
  if (await isBackgroundTrackingOn()) return false;
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, BACKGROUND_OPTIONS);
  return true;
}

export async function stopBackgroundTracking(): Promise<void> {
  // Stopping a task that is not running throws, so check first.
  if (!(await isBackgroundTrackingOn())) return;
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
