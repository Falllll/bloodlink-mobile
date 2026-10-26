import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';

import { readDeviceTokenId, registerDevice } from '@/lib/devices/registry';
import type { DevicePlatform } from '@/lib/devices/types';

type NotificationsModule = typeof import('expo-notifications');

// Loaded conditionally instead of a static import: Expo Go for SDK 57 lacks native
// modules that expo-notifications requires at import time, so a static import kills
// the whole app there. Remote push does not work in Expo Go anyway; it needs a
// development build. null means "not available in this runtime".
export const Notifications: NotificationsModule | null = isRunningInExpoGo()
  ? null
  : (require('expo-notifications') as NotificationsModule);

export type PushEnrollment =
  | { state: 'unknown' }
  | { state: 'unsupported' }        // simulator / emulator without Play Services
  | { state: 'denied'; canAskAgain: boolean }
  | { state: 'granted'; registered: boolean };

export const ANDROID_CHANNEL_ID = 'default';

// Explicit mapping instead of `Platform.OS as DevicePlatform`: Platform.OS is
// wider than the server enum, and a cast would let e.g. 'windows' through to a 422.
export function devicePlatform(): DevicePlatform | null {
  switch (Platform.OS) {
    case 'android':
      return 'android';
    case 'ios':
      return 'ios';
    case 'web':
      return 'web';
    default:
      return null;
  }
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Notifications === null || Platform.OS !== 'android') return;
  // Android 8+ silently drops notifications that have no channel, so this must
  // exist before a token is handed to the server.
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Permintaan darah darurat',
    importance: Notifications.AndroidImportance.MAX,
  });
}

// Fetches the native FCM/APNs token (not an Expo push token: the server talks
// to FCM v1 directly) and registers it. Returns false when no token is available.
export async function registerCurrentToken(): Promise<boolean> {
  const platform = devicePlatform();
  if (Notifications === null || platform === null) return false;
  await ensureAndroidChannel();
  const token = await Notifications.getDevicePushTokenAsync();
  if (typeof token.data !== 'string') return false;
  await registerDevice({ token: token.data, platform });
  return true;
}

// Emulators, simulators and Expo Go have no real push token.
function pushSupported(): boolean {
  return Notifications !== null && Device.isDevice && devicePlatform() !== null;
}

export function useDevicePush(): {
  enrollment: PushEnrollment;
  enable: () => Promise<void>;      // called from a button press, never on mount
  refresh: () => Promise<void>;
} {
  // 'unsupported' is known synchronously, so it is the initial state rather than a
  // setState on mount; the effect below only reads the async permission state.
  const [enrollment, setEnrollment] = useState<PushEnrollment>(() =>
    pushSupported() ? { state: 'unknown' } : { state: 'unsupported' },
  );

  // Reads the current permission state only; never shows the OS permission prompt.
  // Every setState sits in a promise callback, so the mount effect may call this.
  const readPermission = useCallback(async () => {
    const notifications = Notifications;
    if (notifications === null) return;
    await notifications.getPermissionsAsync().then(async (permission) => {
      if (permission.granted) {
        const registered = (await readDeviceTokenId()) !== null;
        setEnrollment({ state: 'granted', registered });
      } else if (permission.status === notifications.PermissionStatus.UNDETERMINED) {
        setEnrollment({ state: 'unknown' });
      } else {
        setEnrollment({ state: 'denied', canAskAgain: permission.canAskAgain });
      }
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setEnrollment({ state: 'unsupported' });
      return;
    }
    await readPermission();
  }, [readPermission]);

  const enable = useCallback(async () => {
    if (Notifications === null || !pushSupported()) {
      setEnrollment({ state: 'unsupported' });
      return;
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.status === Notifications.PermissionStatus.UNDETERMINED) {
      permission = await Notifications.requestPermissionsAsync();
    } else if (!permission.granted && permission.canAskAgain) {
      // Denied but still askable: the button press is the retry.
      permission = await Notifications.requestPermissionsAsync();
    }

    if (!permission.granted) {
      setEnrollment({ state: 'denied', canAskAgain: permission.canAskAgain });
      return;
    }

    let registered = false;
    try {
      registered = await registerCurrentToken();
    } catch {
      // Network or token failure: shown as granted-but-not-registered so the
      // user can press the button again; it is not queued for offline retry.
    }
    setEnrollment({ state: 'granted', registered });
  }, []);

  useEffect(() => {
    if (pushSupported()) void readPermission();
  }, [readPermission]);

  return { enrollment, enable, refresh };
}
