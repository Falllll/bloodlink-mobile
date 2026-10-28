import { useCallback, useMemo } from 'react';

import { cacheKey, useCachedQuery } from '@/lib/api/cache';
import { ApiFailure } from '@/lib/api/client';
import type { ApiSuccess } from '@/lib/api/types';
import { useDonorProfile } from '@/lib/donor/useDonorProfile';
import type { Invitation } from '@/lib/invitations/types';
import { removeKey } from '@/lib/storage/kv';

// Not cursor-paginated: ApiResponse::success() + limit(50), so one cache entry holds it all.
export const INVITATIONS_PATH = '/me/campaign-invitations';

export type InvitationsStatus = 'loading' | 'ready' | 'not-linked' | 'error';

export function useInvitations(): {
  status: InvitationsStatus;
  invitations: Invitation[];
  fromCache: boolean;
  error: ApiFailure | null;
  invalidate: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const query = useCachedQuery<ApiSuccess<Invitation[]>>(INVITATIONS_PATH);
  const { refresh } = query;

  // This endpoint never 404s for a user without a donor row: donorOf() returns null and the
  // answer is { data: [], meta: {} }. So "not linked" cannot be told apart from "no
  // invitations" here; it is asked of /me/donor instead, which does say
  // DONOR_ACCOUNT_NOT_LINKED. Only that definitive answer counts -- a failed profile
  // request (offline) leaves the list status alone.
  const profile = useDonorProfile();

  const invalidate = useCallback(async () => {
    // Drop the pre-mutation entry first: a plain refresh that fails offline would serve it
    // again and resurrect an invitation that was just answered.
    await removeKey(cacheKey(INVITATIONS_PATH));
    await refresh();
  }, [refresh]);

  const rows = query.data?.data;
  const invitations = useMemo(() => sortInvitations(rows ?? []), [rows]);

  let status: InvitationsStatus;
  if (profile.status === 'not-linked') status = 'not-linked';
  else if (query.data !== null) status = 'ready'; // stale rows beat an error screen
  else if (query.loading) status = 'loading';
  else if (query.error !== null) status = 'error';
  else status = 'loading';

  return {
    status,
    invitations,
    fromCache: query.fromCache,
    // Only API failures are surfaced; a network failure leaves this null with status 'error'.
    error: query.error instanceof ApiFailure ? query.error : null,
    invalidate,
    refresh,
  };
}

export function sortInvitations(rows: Invitation[]): Invitation[] {
  // The server orders by contacted_at only; the ones still answerable belong on top.
  return [...rows].sort((a, b) => {
    if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
    const byDeadline = Date.parse(a.needed_by) - Date.parse(b.needed_by);
    if (byDeadline !== 0) return byDeadline;
    return Date.parse(b.contacted_at) - Date.parse(a.contacted_at);
  });
}
