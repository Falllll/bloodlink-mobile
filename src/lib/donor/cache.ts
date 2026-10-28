import { cacheKey } from '@/lib/api/cache';
import { listKeys, removeKey } from '@/lib/storage/kv';
import { APPOINTMENTS_PATH } from '@/lib/appointments/useAppointments';
import { DONATIONS_PATH } from '@/lib/donor/useDonationHistory';
import { INVITATIONS_PATH } from '@/lib/invitations/useInvitations';

/** Donation history and appointments are cached per cursor, so every page key must go. */
export async function clearDonorCache(): Promise<void> {
  const scopes = [cacheKey(DONATIONS_PATH), cacheKey(APPOINTMENTS_PATH), cacheKey(INVITATIONS_PATH)];
  const keys = (await Promise.all(scopes.map((scope) => listKeys(scope)))).flat();
  await Promise.all(keys.map((key) => removeKey(key)));
}
