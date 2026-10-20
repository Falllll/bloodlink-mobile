import { readDeviceTokenId, registerDevice } from '@/lib/devices/registry';
import { Notifications, devicePlatform } from '@/lib/devices/useDevicePush';

// Module scope, like `import '@/lib/location/task'` in _layout.tsx: the OS can
// wake the bundle without rendering any view. Skipped where the module is
// unavailable (Expo Go).
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Screens and layouts never import expo-notifications directly; they subscribe
// to taps through this. Returns the unsubscribe function for useEffect cleanup.
export function onNotificationTap(listener: () => void): () => void {
  if (Notifications === null) return () => {};
  const subscription = Notifications.addNotificationResponseReceivedListener(() => listener());
  return () => subscription.remove();
}

// The OS may rotate the push token at any time. Re-register only when this
// device is currently enrolled (a stored id exists); after sign-out the id is
// gone, so a rotation then does not hit the API without a session.
// POST /me/devices never creates a second row, so re-registering is safe.
Notifications?.addPushTokenListener((token) => {
  void (async () => {
    const platform = devicePlatform();
    if (platform === null || typeof token.data !== 'string') return;
    if ((await readDeviceTokenId()) === null) return;
    try {
      await registerDevice({ token: token.data, platform });
    } catch {
      // Housekeeping only: the next enable/refresh in a later session retries.
    }
  })();
});
