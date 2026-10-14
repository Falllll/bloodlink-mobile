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
