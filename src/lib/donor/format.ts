import type { Appointment, AppointmentStatus } from '@/lib/appointments/types';
import type { BloodGroup, RhFactor } from '@/lib/donor/types';

/** Y-m-d dates carry no time, so they must be read back in UTC. */
export function formatDateOnly(value: string | null): string {
  if (value === null) return '—';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('id-ID', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** ISO-8601 timestamps carry a zone, so they render in the device zone. */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatBloodType(group: BloodGroup | null, rh: RhFactor | null): string {
  if (group === null) return 'Belum diperiksa';
  if (rh === null) return group;
  return group + (rh === 'positive' ? '+' : '−');
}

export function formatVolume(ml: number): string {
  return `${ml} ml`;
}

/**
 * Appointment times are ISO-8601 with a zone, so they render in the device zone.
 * Do NOT add `timeZone: 'UTC'` here: that fix belongs to Y-m-d dates (formatDateOnly) only,
 * and on this field it would show 02:00 for a 09:00 WIB appointment.
 *
 * Walk-ins have no scheduled_for (appointments_walk_in_shape only demands it for booked), so
 * fall back to arrived_at -- the same COALESCE(scheduled_for, arrived_at) the backend lists by.
 */
export function formatAppointmentTime(appointment: Appointment): string {
  const at = appointment.scheduled_for ?? appointment.arrived_at;
  if (at === null) return 'Waktu belum ditetapkan';
  return formatDateTime(at);
}

const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: 'Terjadwal',
  arrived: 'Sudah datang',
  screened: 'Sudah diskrining',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  no_show: 'Tidak hadir',
};

export function formatAppointmentStatus(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABEL[status];
}
