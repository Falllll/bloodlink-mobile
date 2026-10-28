import { useOptimisticMutation } from '@/lib/api/useOptimisticMutation';
import type { CampaignResponse } from '@/lib/invitations/types';
import { INVITATIONS_PATH } from '@/lib/invitations/useInvitations';

/**
 * Body is { response } and nothing else: the backend uses StrictRequest, so any extra key
 * is answered 422 not_allowed. No Idempotency-Key here -- useOptimisticMutation creates one
 * per action and reuses it on every retry, direct or queued.
 */
export function useRespondToInvitation(
  apply: (id: string, response: CampaignResponse) => void,
  rollback: (id: string) => void,
) {
  return useOptimisticMutation<{ id: string; response: CampaignResponse }>({
    path: (vars) => `${INVITATIONS_PATH}/${vars.id}/respond`,
    method: 'POST',
    body: (vars) => ({ response: vars.response }),
    apply: (vars) => apply(vars.id, vars.response),
    rollback: (vars) => rollback(vars.id),
  });
}
