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

export function useDevicePush(): {
  enrollment: PushEnrollment;
  enable: () => Promise<void>;      // called from a button press, never on mount
  refresh: () => Promise<void>;
} {
  const [enrollment, setEnrollment] = useState<PushEnrollment>({ state: 'unknown' });

  // Reads the current state only; never shows the OS permission prompt.
  const refresh = useCallback(async () => {
    if (Notifications === null || !Device.isDevice || devicePlatform() === null) {
      setEnrollment({ state: 'unsupported' });
      return;
    }
    const permission = await Notifications.getPermissionsAsync();
    if (permission.granted) {
      setEnrollment({ state: 'granted', registered: (await readDeviceTokenId()) !== null });
    } else if (permission.status === Notifications.PermissionStatus.UNDETERMINED) {
      setEnrollment({ state: 'unknown' });
    } else {
      setEnrollment({ state: 'denied', canAskAgain: permission.canAskAgain });
    }
  }, []);

  const enable = useCallback(async () => {
    // Emulators, simulators and Expo Go have no real push token.
    if (Notifications === null || !Device.isDevice || devicePlatform() === null) {
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
    void refresh();
  }, [refresh]);

  return { enrollment, enable, refresh };
}
