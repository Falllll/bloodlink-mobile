import { useCallback, useEffect, useRef, useState } from 'react';

import { NetworkUnavailable, apiFetch } from '@/lib/api/client';
import { readJson, writeJson } from '@/lib/storage/kv';

export const DEFAULT_TTL_MS = 5 * 60 * 1000;

export type CacheEntry<T> = { data: T; cachedAt: number };
export type CachedResult<T> = { data: T; fromCache: boolean; cachedAt: number };

export function cacheKey(path: string): string {
  return `cache:${path}`; // query string ikut, jadi filter berbeda = entri berbeda
}

export async function readCached<T>(path: string): Promise<CacheEntry<T> | null> {
  return readJson<CacheEntry<T>>(cacheKey(path));
}

export async function fetchWithCache<T>(path: string, ttlMs?: number): Promise<CachedResult<T>> {
  const ttl = ttlMs ?? DEFAULT_TTL_MS;
  const entry = await readCached<T>(path);

  if (entry && Date.now() - entry.cachedAt < ttl) {
    return { data: entry.data, fromCache: true, cachedAt: entry.cachedAt };
  }

  try {
    const data = await apiFetch<T>(path);
    const cachedAt = Date.now();
    await writeJson(cacheKey(path), { data, cachedAt } satisfies CacheEntry<T>);
    return { data, fromCache: false, cachedAt };
  } catch (error) {
    // Offline with a stale entry: serve it, flagged, rather than an empty screen.
    if (error instanceof NetworkUnavailable && entry) {
      return { data: entry.data, fromCache: true, cachedAt: entry.cachedAt };
    }
    throw error;
  }
}

export function useCachedQuery<T>(path: string, ttlMs?: number): {
  data: T | null;
  fromCache: boolean;
  cachedAt: number | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (ttl: number | undefined, isCurrent: () => boolean) => {
      setLoading(true);
      try {
        const result = await fetchWithCache<T>(path, ttl);
        if (!isCurrent()) return;
        setData(result.data);
        setFromCache(result.fromCache);
        setCachedAt(result.cachedAt);
        setError(null);
      } catch (e) {
        if (!isCurrent()) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    let current = true;
    void load(ttlMs, () => current && mounted.current);
    return () => {
      current = false; // path changed or unmounted: drop this response
    };
  }, [load, ttlMs]);

  const refresh = useCallback(() => load(0, () => mounted.current), [load]);

  return { data, fromCache, cachedAt, loading, error, refresh };
}
