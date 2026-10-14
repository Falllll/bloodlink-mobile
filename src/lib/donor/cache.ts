import { cacheKey } from '@/lib/api/cache';
import { listKeys, removeKey } from '@/lib/storage/kv';
import { DONATIONS_PATH } from '@/lib/donor/useDonationHistory';

/** Donation history is cached per cursor, so every page key must go. */
export async function clearDonorCache(): Promise<void> {
  const keys = await listKeys(cacheKey(DONATIONS_PATH));
  await Promise.all(keys.map((key) => removeKey(key)));
}
