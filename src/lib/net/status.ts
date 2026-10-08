import { addNetworkStateListener, getNetworkStateAsync, useNetworkState } from 'expo-network';
import type { EventSubscription } from 'expo-modules-core';

type Reachability = { isConnected?: boolean; isInternetReachable?: boolean };

export function isOnline(state: Reachability): boolean {
  // isInternetReachable may be undefined while the OS is still probing: only an
  // explicit false counts as unreachable.
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function useOnline(): boolean {
  return isOnline(useNetworkState());
}

export async function checkOnline(): Promise<boolean> {
  return isOnline(await getNetworkStateAsync());
}

export function onOnline(handler: () => void): EventSubscription {
  return addNetworkStateListener((event) => { if (isOnline(event)) handler(); });
}
