import { useOptimisticMutation } from '@/lib/api/useOptimisticMutation';
import type { Appointment } from '@/lib/appointments/types';
import { APPOINTMENTS_PATH } from '@/lib/appointments/useAppointments';

/** Donors may only ever send `cancelled`; every other status is a staff statement. */
export function useCancelAppointment(
  onApply: (appointment: Appointment) => void,
  onRollback: (appointment: Appointment) => void,
) {
  return useOptimisticMutation<Appointment>({
    path: (a) => `${APPOINTMENTS_PATH}/${a.id}/status`,
    method: 'PATCH',
    body: () => ({ status: 'cancelled' }),
    apply: (a) => onApply(a),
    rollback: (a) => onRollback(a),
  });
}
