import { useCallback, useEffect, useState } from 'react';

import { ApiFailure, apiFetch } from '@/lib/api/client';
import type { ApiSuccess } from '@/lib/api/types';
import type { DonorProfile } from '@/lib/donor/types';

export type ProfileStatus = 'loading' | 'ready' | 'not-linked' | 'error';

export type DonorProfileHandle = {
  status: ProfileStatus;
  profile: DonorProfile | null;
  error: ApiFailure | Error | null;
  reload: () => Promise<void>;
};

type ProfileState = Omit<DonorProfileHandle, 'reload'>;

const LOADING: ProfileState = { status: 'loading', profile: null, error: null };

export function useDonorProfile(): DonorProfileHandle {
  const [state, setState] = useState<ProfileState>(LOADING);

  // The profile holds contact and health data: it stays in memory only, never in cache.ts.
  const load = useCallback(async (isCurrent: () => boolean) => {
    setState(LOADING);
    try {
      const res = await apiFetch<ApiSuccess<DonorProfile>>('/me/donor');
      if (!isCurrent()) return;
      setState({ status: 'ready', profile: res.data, error: null });
    } catch (e) {
      if (!isCurrent()) return;
      if (e instanceof ApiFailure && e.status === 404 && e.body.error.code === 'DONOR_ACCOUNT_NOT_LINKED') {
        setState({ status: 'not-linked', profile: null, error: null });
        return;
      }
      setState({ status: 'error', profile: null, error: e instanceof Error ? e : new Error(String(e)) });
    }
  }, []);

  useEffect(() => {
    let current = true;
    void load(() => current);
    return () => {
      current = false; // unmounted: drop this response
    };
  }, [load]);

  const reload = useCallback(() => load(() => true), [load]);

  return { ...state, reload };
}
