export type NotificationCategoryKey =
  | 'emergency_call'
  | 'appointment_reminder'
  | 'donation_status'
  | 'general';

export type NotificationPreference = {
  category: NotificationCategoryKey;
  enabled: boolean;
  opted_out_at: string | null;
};

export type NotificationPreferences = {
  callable_for_emergencies: boolean;
  preferences: NotificationPreference[];
};

export const PREFERENCES_PATH = '/me/notification-preferences';
