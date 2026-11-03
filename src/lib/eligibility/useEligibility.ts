import { useCallback, useEffect, useState } from 'react';

import { ApiFailure, apiFetch } from '@/lib/api/client';
import type { ApiSuccess } from '@/lib/api/types';
import { ELIGIBILITY_PATH, type DonorEligibility } from './types';

export type EligibilityHandle = {
  status: 'loading' | 'ready' | 'not-linked' | 'error';
  eligibility: DonorEligibility | null;
  // Wider than ApiFailure: NetworkUnavailable is what tells the offline state apart.
  error: ApiFailure | Error | null;
  reload: () => Promise<void>;
};

type EligibilityState = Omit<EligibilityHandle, 'reload'>;

const LOADING: EligibilityState = { status: 'loading', eligibility: null, error: null };

export function useEligibility(): EligibilityHandle {
  const [state, setState] = useState<EligibilityState>(LOADING);

  // Health data stays in memory only: NEVER fetchWithCache here, the API contract forbids a
  // disk cache. A stale "eligible" could also hide a deferral recorded since it was stored.
  // Every setState sits in a promise callback, so the mount effect may call this.
  const fetchEligibility = useCallback(
    (isCurrent: () => boolean) =>
      apiFetch<ApiSuccess<DonorEligibility>>(ELIGIBILITY_PATH).then(
        (res) => {
          if (isCurrent()) setState({ status: 'ready', eligibility: res.data, error: null });
        },
        (e: unknown) => {
          if (!isCurrent()) return;
          if (e instanceof ApiFailure && e.status === 404 && e.body.error.code === 'DONOR_ACCOUNT_NOT_LINKED') {
            setState({ status: 'not-linked', eligibility: null, error: null });
            return;
          }
          setState({ status: 'error', eligibility: null, error: e instanceof Error ? e : new Error(String(e)) });
        },
      ),
    [],
  );

  useEffect(() => {
    let current = true;
    void fetchEligibility(() => current);
    return () => {
      current = false; // unmounted: drop this response
    };
  }, [fetchEligibility]);

  const reload = useCallback(async () => {
    setState(LOADING);
    await fetchEligibility(() => true);
  }, [fetchEligibility]);

  return { ...state, reload };
}
