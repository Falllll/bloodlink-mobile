import { useCallback, useEffect, useState } from 'react';

import { getDonorFix, LAST_KNOWN_MAX_AGE_MS, type FixOptions } from '@/lib/location/fix';
import {
  openOsLocationSettings,
  readPermissionState,
  requestBackgroundAccess,
  requestForegroundAccess,
  type LocationPermissionState,
} from '@/lib/location/permissions';
import { readLastLocation, type StoredLocation } from '@/lib/location/store';
import { isBackgroundTrackingOn, startBackgroundTracking, stopBackgroundTracking } from '@/lib/location/task';

export type DonorLocationStatus = 'checking' | 'ready' | 'stale' | 'denied' | 'services-off' | 'unavailable';

export type DonorLocationHandle = {
  status: DonorLocationStatus;
  permission: LocationPermissionState;
  last: StoredLocation | null;
  backgroundOn: boolean;
  refresh: (options?: FixOptions) => Promise<StoredLocation | null>;
  grantForeground: () => Promise<LocationPermissionState>;
  grantBackground: () => Promise<LocationPermissionState>;
  setBackground: (on: boolean) => Promise<void>;
  openSettings: () => Promise<void>;
};

const INITIAL_PERMISSION: LocationPermissionState = {
  level: 'undetermined',
  canAskAgain: true,
  servicesEnabled: true,
};

function deriveStatus(permission: LocationPermissionState, last: StoredLocation | null): DonorLocationStatus {
  if (!permission.servicesEnabled) return 'services-off';
  const granted = permission.level === 'foreground' || permission.level === 'background';
  if (!granted) {
    // A cached fix keeps consumers working even after the permission is gone.
    if (last) return 'stale';
    return permission.level === 'denied' ? 'denied' : 'unavailable';
  }
  if (!last) return 'unavailable';
  return Date.now() - last.capturedAt > LAST_KNOWN_MAX_AGE_MS ? 'stale' : 'ready';
}

async function readBackgroundOn(): Promise<boolean> {
  try {
    return await isBackgroundTrackingOn();
  } catch {
    return false; // Expo Go has no background location: treat as off instead of crashing
  }
}

export function useDonorLocation(): DonorLocationHandle {
  const [checking, setChecking] = useState(true);
  const [permission, setPermission] = useState<LocationPermissionState>(INITIAL_PERMISSION);
  const [last, setLast] = useState<StoredLocation | null>(null);
  const [backgroundOn, setBackgroundOn] = useState(false);

  // Mount only reads state: no permission dialog may appear until the user asks for it.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nextPermission, nextLast, nextBackground] = await Promise.all([
          readPermissionState(),
          readLastLocation(),
          readBackgroundOn(),
        ]);
        if (cancelled) return;
        setPermission(nextPermission);
        setLast(nextLast);
        setBackgroundOn(nextBackground);
      } catch (error) {
        console.warn('[location] reading initial state failed', error);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const syncPermission = useCallback(async () => {
    try {
      const next = await readPermissionState();
      setPermission(next);
      return next;
    } catch (error) {
      console.warn('[location] reading permission state failed', error);
      return null;
    }
  }, []);

  const refresh = useCallback(
    async (options?: FixOptions) => {
      const fix = await getDonorFix(options);
      setLast(fix);
      await syncPermission(); // services may have been switched off since mount
      return fix;
    },
    [syncPermission],
  );

  const grantForeground = useCallback(async () => {
    const next = await requestForegroundAccess();
    setPermission(next);
    return next;
  }, []);

  const grantBackground = useCallback(async () => {
    const next = await requestBackgroundAccess();
    setPermission(next);
    return next;
  }, []);

  const setBackground = useCallback(async (on: boolean) => {
    try {
      if (on) await startBackgroundTracking();
      else await stopBackgroundTracking();
    } catch (error) {
      console.warn('[location] toggling background tracking failed', error);
    }
    setBackgroundOn(await readBackgroundOn());
  }, []);

  const openSettings = useCallback(() => openOsLocationSettings(), []);

  return {
    status: checking ? 'checking' : deriveStatus(permission, last),
    permission,
    last,
    backgroundOn,
    refresh,
    grantForeground,
    grantBackground,
    setBackground,
    openSettings,
  };
}
