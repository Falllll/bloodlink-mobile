import type { Appointment, AppointmentStatus } from '@/lib/appointments/types';
import type { BloodGroup, RhFactor } from '@/lib/donor/types';
import type { BloodComponent, RequestUrgency } from '@/lib/invitations/types';

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

export function formatDistance(meters: number): string {
  const rounded = Math.round(meters);
  if (rounded < 1000) return `${rounded} m`;
  const km = (meters / 1000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${km} km`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Coarse countdown to an ISO-8601 deadline, with the built-in Date only (no date library). */
export function formatTimeLeft(neededByIso: string, now: Date): string {
  const left = Date.parse(neededByIso) - now.getTime();
  if (Number.isNaN(left)) return '—';
  if (left <= 0) return 'lewat';
  if (left < HOUR_MS) return `${Math.max(1, Math.floor(left / MINUTE_MS))} menit lagi`;
  if (left < DAY_MS) return `${Math.floor(left / HOUR_MS)} jam lagi`;
  // Past a day, count calendar days in the device zone: 47 hours from this morning is
  // the day after tomorrow, not "besok". Math.round absorbs a DST hour.
  const days = Math.round((startOfDay(new Date(neededByIso)) - startOfDay(now)) / DAY_MS);
  if (days <= 1) return 'besok';
  return `${days} hari lagi`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export const COMPONENT_LABEL: Record<BloodComponent, string> = {
  whole_blood: 'Darah lengkap',
  packed_red_cells: 'Sel darah merah pekat (PRC)',
  fresh_frozen_plasma: 'Plasma segar beku (FFP)',
  platelet_concentrate: 'Trombosit pekat',
  cryoprecipitate: 'Kriopresipitat',
};

export const URGENCY_LABEL: Record<RequestUrgency, string> = {
  routine: 'Rutin',
  urgent: 'Mendesak',
  emergency: 'Darurat',
};
