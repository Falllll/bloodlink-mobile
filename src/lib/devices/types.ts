export type DevicePlatform = 'android' | 'ios' | 'web';

export type DeviceTokenRecord = {
  id: string;                  // public_id (uuid) — the handle used to revoke
  platform: DevicePlatform;
  last_seen_at: string;
  revoked_at: string | null;
};

export type RegisterDevicePayload = {
  token: string;               // required, maxLength 512
  platform: DevicePlatform;    // required
};
