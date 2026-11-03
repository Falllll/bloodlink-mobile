import React, { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import { ApiFailure, NetworkUnavailable } from '@/lib/api/client';
import type { OptimisticState } from '@/lib/api/useOptimisticMutation';
import type { NotificationCategoryKey, NotificationPreference } from '@/lib/notifications/types';
import { usePreferences } from '@/lib/notifications/usePreferences';
import { useSetPreference } from '@/lib/notifications/useSetPreference';
import { colors, radii, spacing } from '@/theme/tokens';

/** Indonesian copy for each category: none exists in either repo, so it is authored here. */
const CATEGORY_LABEL: Record<NotificationCategoryKey, { title: string; detail: string }> = {
  emergency_call: {
    title: 'Panggilan donor darurat',
    detail: 'Mematikan ini berarti kamu keluar dari daftar panggilan dan tidak akan dipanggil saat darah darurat dibutuhkan.',
  },
  appointment_reminder: {
    title: 'Pengingat janji temu',
    detail: 'Pengingat sebelum jadwal donormu.',
  },
  donation_status: {
    title: 'Status donasi',
    detail: 'Kabar tentang donasi yang sudah kamu lakukan.',
  },
  general: {
    title: 'Informasi umum',
    detail: 'Pengumuman dan informasi lain dari BloodLink.',
  },
};

/** Branches on error.code only; error.message is neither stable nor localized. */
function mutationMessage(error: ApiFailure | null): string {
  switch (error?.body?.error?.code) {
    case 'VALIDATION_FAILED':
      return 'Perubahan tidak diterima. Pengaturan dikembalikan seperti semula.';
    case 'TOO_MANY_REQUESTS':
      return 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.';
    case 'UNAUTHENTICATED':
      return 'Sesimu sudah berakhir. Masuk kembali untuk mengubah pengaturan.';
    default:
      return 'Perubahan gagal disimpan. Coba lagi.';
  }
}

/** The server's demand for the donor's consent: a cue to ask, not an error to show. */
function asksForAcknowledgement(error: ApiFailure | null): boolean {
  if (error?.status !== 422 || error.body?.error?.code !== 'VALIDATION_FAILED') return false;
  return 'acknowledge_leaving_call_list' in (error.body.error.details ?? {});
}

const IN_FLIGHT: readonly OptimisticState[] = ['pending', 'queued'];

export function CategoryPreferences(): React.ReactElement | null {
  const prefs = usePreferences();
  const { invalidate } = prefs;
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  // Cleared on the next action, so an old failure never lingers under a newer state.
  const [failed, setFailed] = useState(false);

  const mutation = useSetPreference(
    (v) => prefs.patchLocal(v.category, v.enabled),
    (v) => prefs.patchLocal(v.category, !v.enabled),
  );

  // Local UI state follows the mutation outcome during render, not in an effect: no extra
  // render with stale UI. The mutation starts 'idle', so nothing fires on mount.
  const [seenState, setSeenState] = useState(mutation.state);
  if (mutation.state !== seenState) {
    setSeenState(mutation.state);
    if (mutation.state === 'failed') {
      if (asksForAcknowledgement(mutation.error)) setConfirmingLeave(true);
      else setFailed(true);
    }
  }

  // A mutation that settled (directly or from the offline queue) is confirmed by re-reading
  // the server. That network call is a real side effect, so it stays in an effect.
  useEffect(() => {
    if (mutation.state === 'done' || mutation.state === 'failed') void invalidate();
  }, [mutation.state, invalidate]);

  // The hook tracks one state: with two actions in flight, the second 'done' would change
  // nothing and its re-read would be skipped, so only one action may be open at a time.
  const locked = IN_FLIGHT.includes(mutation.state);

  function toggle(category: NotificationCategoryKey, enabled: boolean) {
    if (locked) return;
    if (category === 'emergency_call' && !enabled) {
      // Ask first: nothing is sent and the switch stays put until the donor agrees.
      setConfirmingLeave(true);
      return;
    }
    setConfirmingLeave(false);
    setFailed(false);
    void mutation.run({ category, enabled });
  }

  function confirmLeave() {
    setConfirmingLeave(false);
    setFailed(false);
    void mutation.run({ category: 'emergency_call', enabled: false, acknowledge: true });
  }

  if (prefs.status === 'not-linked') return null;

  return (
    <View testID="profile-notification-categories">
      <Card title="Kategori notifikasi">
        {prefs.status === 'loading' ? <AppText tone="muted">Memuat…</AppText> : null}

        {prefs.status === 'error' ? (
          <>
            <AppText tone="muted" testID="notification-categories-error">
              {prefs.error instanceof NetworkUnavailable
                ? 'Tidak ada koneksi. Pengaturan ini tidak disimpan di perangkat, jadi hanya bisa dimuat saat online.'
                : 'Terjadi kesalahan saat memuat pengaturan notifikasi.'}
            </AppText>
            <Button label="Coba lagi" onPress={prefs.reload} />
          </>
        ) : null}

        {prefs.status === 'ready' && prefs.data ? (
          <View style={{ gap: spacing.lg }}>
            <EmergencyBanner callable={prefs.data.callable_for_emergencies} />

            {mutation.state === 'queued' ? (
              <AppText tone="muted" testID="notification-categories-queued">
                Menunggu koneksi… Perubahanmu akan dikirim otomatis.
              </AppText>
            ) : null}
            {failed ? (
              <AppText tone="soft" testID="notification-categories-failed">
                {mutationMessage(mutation.error)}
              </AppText>
            ) : null}

            {prefs.data.preferences.map((preference) => (
              <CategoryRow
                key={preference.category}
                preference={preference}
                locked={locked}
                onToggle={(enabled) => toggle(preference.category, enabled)}
              >
                {preference.category === 'emergency_call' && confirmingLeave ? (
                  <LeaveCallListConfirm onConfirm={confirmLeave} onAbort={() => setConfirmingLeave(false)} />
                ) : null}
              </CategoryRow>
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

/** States the server's own callable_for_emergencies, never one inferred from the switches. */
function EmergencyBanner({ callable }: { callable: boolean }): React.ReactElement {
  const fg = callable ? colors.status.RELEASED : colors.brandText;
  return (
    <View
      testID="notification-emergency-banner"
      style={{
        backgroundColor: `${callable ? colors.status.RELEASED : colors.brand}2E`, // 18% alpha, same mix as StatusChip
        borderColor: fg,
        borderWidth: callable ? 0 : 1,
        borderRadius: radii.lg,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <AppText variant="label" style={{ color: fg }}>
        {callable ? 'Kamu ada di daftar panggilan darurat' : 'Kamu TIDAK ada di daftar panggilan darurat'}
      </AppText>
      <AppText tone={callable ? 'muted' : 'strong'}>
        {callable
          ? 'Kamu bisa dipanggil saat darah darurat dibutuhkan di dekatmu.'
          : 'Kamu tidak akan dipanggil saat darah darurat dibutuhkan. Nyalakan panggilan donor darurat untuk kembali.'}
      </AppText>
    </View>
  );
}

function CategoryRow({
  preference,
  locked,
  onToggle,
  children,
}: {
  preference: NotificationPreference;
  locked: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}): React.ReactElement {
  const label = CATEGORY_LABEL[preference.category];
  return (
    <View style={{ gap: spacing.sm }} testID={`notification-category-${preference.category}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText tone="strong">{label.title}</AppText>
          <AppText variant="caption" tone="muted">{label.detail}</AppText>
        </View>
        <Switch
          value={preference.enabled}
          onValueChange={onToggle}
          disabled={locked}
          accessibilityLabel={label.title}
          trackColor={{ false: colors.secondary, true: colors.brandDeep }}
          thumbColor={preference.enabled ? colors.brandText : colors.ink.muted}
        />
      </View>
      {children}
    </View>
  );
}

function LeaveCallListConfirm({
  onConfirm,
  onAbort,
}: {
  onConfirm: () => void;
  onAbort: () => void;
}): React.ReactElement {
  return (
    <View style={{ gap: spacing.sm }} testID="notification-leave-call-list-confirm">
      <AppText>
        Kalau kamu keluar dari daftar panggilan, kamu tidak akan dipanggil saat ada yang darurat membutuhkan darah
        di dekatmu. Kamu bisa kembali kapan saja dengan menyalakan pengaturan ini.
      </AppText>
      <Button label="Ya, keluar dari daftar panggilan" onPress={onConfirm} />
      <Button label="Tetap di daftar panggilan" variant="ghost" onPress={onAbort} />
    </View>
  );
}
