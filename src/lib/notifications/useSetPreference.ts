import { useOptimisticMutation } from '@/lib/api/useOptimisticMutation';
import { PREFERENCES_PATH, type NotificationCategoryKey } from './types';

export type SetPreferenceVars = {
  category: NotificationCategoryKey;
  enabled: boolean;
  /** Only ever true when leaving the emergency call list, after the donor confirmed. */
  acknowledge?: boolean;
};

export function useSetPreference(
  onApply: (vars: SetPreferenceVars) => void,
  onRollback: (vars: SetPreferenceVars) => void,
) {
  return useOptimisticMutation<SetPreferenceVars>({
    path: (v) => `${PREFERENCES_PATH}/${v.category}`,
    method: 'PATCH',
    body: (v) => (v.acknowledge === true
      ? { enabled: v.enabled, acknowledge_leaving_call_list: true }
      : { enabled: v.enabled }),
    apply: (v) => onApply(v),
    rollback: (v) => onRollback(v),
  });
}
