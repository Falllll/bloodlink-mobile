import { useOptimisticMutation } from '@/lib/api/useOptimisticMutation';
import { APPOINTMENTS_PATH } from '@/lib/appointments/useAppointments';

export type BookAppointmentVars = { scheduledFor: string; note?: string };

/**
 * Books through the shared optimistic mutation: one Idempotency-Key per tap, offline queue,
 * rollback on permanent failure. onApply must NOT invent a confirmed row -- the server may
 * still refuse the time -- it only marks the booking as pending until the list is refreshed.
 */
export function useBookAppointment(onApply: (iso: string) => void, onRollback: () => void) {
  return useOptimisticMutation<BookAppointmentVars>({
    path: () => APPOINTMENTS_PATH,
    method: 'POST',
    // Never send a key other than scheduled_for and note: the backend rejects unknown
    // keys with 422 'not_allowed'.
    body: (v) => ({ scheduled_for: v.scheduledFor, ...(v.note ? { note: v.note } : {}) }),
    apply: (v) => onApply(v.scheduledFor),
    rollback: () => onRollback(),
  });
}
