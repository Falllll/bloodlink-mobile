import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiFailure, apiFetch } from '@/lib/api/client';
import type { ApiSuccess } from '@/lib/api/types';
import { PREFERENCES_PATH, type NotificationCategoryKey, type NotificationPreferences } from './types';

export type PreferencesHandle = {
  status: 'loading' | 'ready' | 'not-linked' | 'error';
  data: NotificationPreferences | null;
  // Wider than ApiFailure: NetworkUnavailable is what tells the offline state apart.
  error: ApiFailure | Error | null;
  reload: () => Promise<void>;
  /** Re-reads the server after a mutation settled, keeping the current rows on screen. */
  invalidate: () => Promise<void>;
  patchLocal: (category: NotificationCategoryKey, enabled: boolean) => void;
};

type PreferencesState = Omit<PreferencesHandle, 'reload' | 'invalidate' | 'patchLocal'>;

const LOADING: PreferencesState = { status: 'loading', data: null, error: null };

export function usePreferences(): PreferencesHandle {
  const [state, setState] = useState<PreferencesState>(LOADING);
  // Bumped by every load and local patch, so an older response cannot land on top of them.
  const generation = useRef(0);

  // Who may call this donor in an emergency is as sensitive as the profile: it stays in
  // memory only, NEVER fetchWithCache. A pre-mutation cache entry would also bring a
  // category the donor just switched off back to life.
  const fetchPreferences = useCallback((keepRowsOnError: boolean) => {
    const mine = ++generation.current;
    return apiFetch<ApiSuccess<NotificationPreferences>>(PREFERENCES_PATH).then(
      (res) => {
        if (mine === generation.current) setState({ status: 'ready', data: res.data, error: null });
      },
      (e: unknown) => {
        if (mine !== generation.current) return;
        if (e instanceof ApiFailure && e.status === 404 && e.body.error.code === 'DONOR_ACCOUNT_NOT_LINKED') {
          setState({ status: 'not-linked', data: null, error: null });
          return;
        }
        if (keepRowsOnError) return; // the rows on screen beat an error for a background re-read
        setState({ status: 'error', data: null, error: e instanceof Error ? e : new Error(String(e)) });
      },
    );
  }, []);

  useEffect(() => {
    void fetchPreferences(false);
    const owned = generation;
    return () => {
      owned.current += 1; // unmounted: drop whatever is still in flight
    };
  }, [fetchPreferences]);

  const reload = useCallback(async () => {
    setState(LOADING);
    await fetchPreferences(false);
  }, [fetchPreferences]);

  // No kv key to drop here because nothing is cached, so this is only a re-read. It stays
  // silent so the switches do not vanish behind a loading state after every press.
  const invalidate = useCallback(() => fetchPreferences(true), [fetchPreferences]);

  const patchLocal = useCallback((category: NotificationCategoryKey, enabled: boolean) => {
    generation.current += 1;
    setState((current) => {
      if (current.data === null) return current;
      return {
        ...current,
        data: {
          // Optimistic only, so the banner moves with the switch; the re-read after the
          // mutation settles replaces it with the server's own statement.
          callable_for_emergencies:
            category === 'emergency_call' ? enabled : current.data.callable_for_emergencies,
          preferences: current.data.preferences.map((row) => (row.category === category ? { ...row, enabled } : row)),
        },
      };
    });
  }, []);

  return { ...state, reload, invalidate, patchLocal };
}
