import { Storage } from 'expo-sqlite/kv-store';

const PREFIX = 'bl:';

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await Storage.getItemAsync(PREFIX + key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null; // corrupt entry: treat as missing instead of crashing the caller
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await Storage.setItemAsync(PREFIX + key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await Storage.removeItemAsync(PREFIX + key);
}

export async function listKeys(scope: string): Promise<string[]> {
  const keys = await Storage.getAllKeysAsync();
  return keys
    .filter((key) => key.startsWith(PREFIX + scope))
    .map((key) => key.slice(PREFIX.length));
}
