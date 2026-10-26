import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cacheKey, fetchWithCache } from '@/lib/api/cache';
import { ApiFailure } from '@/lib/api/client';
import type { ApiPaginated } from '@/lib/api/types';
import { OPEN_STATUSES, type Appointment } from '@/lib/appointments/types';
import { listKeys, removeKey } from '@/lib/storage/kv';

export const APPOINTMENTS_PATH = '/me/donor/appointments';

export type AppointmentsHandle = {
  appointments: Appointment[];
  openAppointment: Appointment | null;   // the booked one, if any
  status: 'loading' | 'ready' | 'not-linked' | 'error';
  error: Error | null;
  fromCache: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  refresh: () => Promise<void>;
  /**
   * Drops the cached pages, then reloads. Call after a mutation landed: a plain refresh that
   * fails offline would serve the pre-mutation cache and resurrect a cancelled appointment.
   */
  invalidate: () => Promise<void>;
  loadMore: () => Promise<void>;
  /** Replaces one row in place (optimistic cancel and its rollback). */
  patchRow: (id: string, next: Appointment) => void;
};

function isNotLinked(e: unknown): boolean {
  return e instanceof ApiFailure && e.status === 404 && e.body.error.code === 'DONOR_ACCOUNT_NOT_LINKED';
}

export function useAppointments(): AppointmentsHandle {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [status, setStatus] = useState<AppointmentsHandle['status']>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Bumped on every first-page load so a slower, older response cannot land on top of it.
  const generation = useRef(0);
  const busy = useRef(false);

  // Every setState sits in a promise callback, so the mount effect may call this (the
  // React Compiler lint flags any local function that sets state in its own body).
  // status already starts as 'loading'; loadFirst() is the caller-facing variant.
  const fetchFirst = useCallback((ttlMs?: number) => {
    const mine = ++generation.current;
    return fetchWithCache<ApiPaginated<Appointment>>(APPOINTMENTS_PATH, ttlMs).then(
      (res) => {
        if (mine !== generation.current) return;
        setRows(res.data.data);
        setCursor(res.data.meta.next_cursor);
        setHasMore(res.data.meta.has_more);
        setFromCache(res.fromCache);
        setError(null);
        setStatus('ready');
      },
      (e: unknown) => {
        if (mine !== generation.current) return;
        if (isNotLinked(e)) {
          setStatus('not-linked');
          return;
        }
        setError(e instanceof Error ? e : new Error(String(e)));
        setStatus('error');
      },
    );
  }, []);

  const loadFirst = useCallback(async (ttlMs?: number) => {
    setStatus('loading');
    await fetchFirst(ttlMs);
  }, [fetchFirst]);

  useEffect(() => {
    void fetchFirst();
    return () => {
      generation.current++; // unmounted: drop any response still in flight
    };
  }, [fetchFirst]);

  const refresh = useCallback(async () => {
    setCursor(null);
    setHasMore(false);
    await loadFirst(0);
  }, [loadFirst]);

  const invalidate = useCallback(async () => {
    const keys = await listKeys(cacheKey(APPOINTMENTS_PATH));
    await Promise.all(keys.map((key) => removeKey(key)));
    await refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore || cursor === null) return;
    const mine = generation.current;
    busy.current = true;
    setLoadingMore(true);
    try {
      const res = await fetchWithCache<ApiPaginated<Appointment>>(
        `${APPOINTMENTS_PATH}?cursor=${encodeURIComponent(cursor)}`,
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

  const patchRow = useCallback((id: string, next: Appointment) => {
    setRows((prev) => prev.map((row) => (row.id === id ? next : row)));
  }, []);

  // Derived, never stored: the list is the single source of truth.
  const openAppointment = useMemo(
    () => rows.find((row) => OPEN_STATUSES.includes(row.status)) ?? null,
    [rows],
  );

  return {
    appointments: rows, openAppointment, status, error, fromCache, hasMore, loadingMore,
    refresh, invalidate, loadMore, patchRow,
  };
}
