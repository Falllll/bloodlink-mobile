import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchWithCache } from '@/lib/api/cache';
import type { ApiPaginated } from '@/lib/api/types';
import type { Donation } from '@/lib/donor/types';

export const DONATIONS_PATH = '/me/donor/donations';

export type DonationHistoryHandle = {
  donations: Donation[];
  loading: boolean;
  loadingMore: boolean;
  fromCache: boolean;
  hasMore: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

export function useDonationHistory(): DonationHistoryHandle {
  const [rows, setRows] = useState<Donation[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Bumped on every first-page load so a slower, older response cannot land on top of it.
  const generation = useRef(0);
  const busy = useRef(false);

  const loadFirst = useCallback(async (ttlMs?: number) => {
    const mine = ++generation.current;
    setLoading(true);
    try {
      const res = await fetchWithCache<ApiPaginated<Donation>>(DONATIONS_PATH, ttlMs);
      if (mine !== generation.current) return;
      setRows(res.data.data);
      setCursor(res.data.meta.next_cursor);
      setHasMore(res.data.meta.has_more);
      setFromCache(res.fromCache);
      setError(null);
    } catch (e) {
      if (mine !== generation.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (mine === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFirst();
    return () => {
      generation.current++; // unmounted: drop any response still in flight
    };
  }, [loadFirst]);

  const refresh = useCallback(async () => {
    setRows([]);
    setCursor(null);
    setHasMore(false);
    await loadFirst(0);
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore || cursor === null) return;
    const mine = generation.current;
    busy.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchWithCache<ApiPaginated<Donation>>(
        `${DONATIONS_PATH}?cursor=${encodeURIComponent(cursor)}`,
      );
      if (mine !== generation.current) return;
      setRows((prev) => [...prev, ...res.data.data]);
      setCursor(res.data.meta.next_cursor);
      setHasMore(res.data.meta.has_more);
      setFromCache((prev) => prev || res.fromCache);
      setError(null);
    } catch (e) {
      if (mine !== generation.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [cursor, hasMore]);

  return { donations: rows, loading, loadingMore, fromCache, hasMore, error, refresh, loadMore };
}
