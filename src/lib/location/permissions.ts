import * as Location from 'expo-location';
import { Linking } from 'react-native';

export type LocationPermissionLevel = 'undetermined' | 'denied' | 'foreground' | 'background';

export type LocationPermissionState = {
  level: LocationPermissionLevel;
  canAskAgain: boolean;
  servicesEnabled: boolean;
};

export async function readPermissionState(): Promise<LocationPermissionState> {
  const [foreground, background, servicesEnabled] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
  ]);

  let level: LocationPermissionLevel;
  if (foreground.granted) level = background.granted ? 'background' : 'foreground';
  else if (foreground.status === Location.PermissionStatus.UNDETERMINED) level = 'undetermined';
  else level = 'denied';

  // Once foreground is granted, the next prompt the user can still answer is the background one.
  const canAskAgain = level === 'foreground' ? background.canAskAgain : foreground.canAskAgain;

  return { level, canAskAgain, servicesEnabled };
}

export async function requestForegroundAccess(): Promise<LocationPermissionState> {
  await Location.requestForegroundPermissionsAsync();
  return readPermissionState();
}

export async function requestBackgroundAccess(): Promise<LocationPermissionState> {
  const current = await readPermissionState();
  // Foreground must be granted first; asking for background earlier makes iOS show both prompts at once.
  if (current.level !== 'foreground') return current;
  await Location.requestBackgroundPermissionsAsync();
  return readPermissionState();
}

export async function openOsLocationSettings(): Promise<void> {
  await Linking.openSettings();
}
