import * as SecureStore from 'expo-secure-store';

const KEY = 'bl_token';

export async function readToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function writeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
