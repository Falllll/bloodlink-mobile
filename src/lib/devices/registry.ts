import { ApiFailure, apiFetch, newIdempotencyKey } from '@/lib/api/client';
import type { ApiSuccess } from '@/lib/api/types';
import type { DeviceTokenRecord, RegisterDevicePayload } from '@/lib/devices/types';
import { readJson, removeKey, writeJson } from '@/lib/storage/kv';

// kv.ts adds the `bl:` prefix itself, so this is stored as `bl:device-token-id`.
// Only the public id is kept locally; the push token value is a delivery
// credential the OS already holds.
const ID_KEY = 'device-token-id';

export async function readDeviceTokenId(): Promise<string | null> {
  return readJson<string>(ID_KEY);
}

export async function registerDevice(payload: RegisterDevicePayload): Promise<DeviceTokenRecord> {
  // Called directly, never through the offline retry queue: registration is
  // housekeeping that repeats on the next session, and a queued stale token
  // would land days later.
  const key = newIdempotencyKey();
  const { data } = await apiFetch<ApiSuccess<DeviceTokenRecord>>('/me/devices', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Idempotency-Key': key },
  });
  await writeJson(ID_KEY, data.id);
  return data;
}

export async function revokeDevice(): Promise<void> {
  const id = await readDeviceTokenId();
  if (id === null) return;
  try {
    await apiFetch<ApiSuccess<DeviceTokenRecord>>(`/me/devices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (error) {
    // NOT_FOUND means already revoked or no longer ours: the goal is reached.
    if (!(error instanceof ApiFailure && error.body.error.code === 'NOT_FOUND')) throw error;
  } finally {
    // Always forget the id, even on failure: a stale id is worse than no id.
    await removeKey(ID_KEY);
  }
}
