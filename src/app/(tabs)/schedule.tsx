import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateTimePicker } from '@/components/appointments/DateTimePicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import { ApiFailure, NetworkUnavailable } from '@/lib/api/client';
import type { OptimisticState } from '@/lib/api/useOptimisticMutation';
import { DONOR_ACTIONABLE_STATUSES, OPEN_STATUSES, type Appointment, type AppointmentStatus } from '@/lib/appointments/types';
import { useAppointments, type AppointmentsHandle } from '@/lib/appointments/useAppointments';
import { useBookAppointment } from '@/lib/appointments/useBookAppointment';
import { useCancelAppointment } from '@/lib/appointments/useCancelAppointment';
import { formatAppointmentStatus, formatAppointmentTime, formatDateTime } from '@/lib/donor/format';
import { colors, spacing } from '@/theme/tokens';

const IN_FLIGHT: readonly OptimisticState[] = ['pending', 'queued'];

// Open but not actionable: the donor is at the facility and staff handle the rest there.
const ON_SITE_NOTE: Partial<Record<AppointmentStatus, string>> = {
  arrived: 'Kamu sudah tercatat hadir di fasilitas. Proses selanjutnya ditangani petugas di sana.',
  screened: 'Skrining sudah dilakukan. Proses selanjutnya ditangani petugas di sana.',
};

/** Branches on error.code only; error.message is neither stable nor localized. */
function mutationMessage(error: ApiFailure | null, action: 'book' | 'cancel'): string {
  // Widened to string: ErrorCode in lib/api/types does not list the appointment codes yet.
  const code: string | undefined = error?.body?.error?.code;
  switch (code) {
    case 'APPOINTMENT_TRANSITION_REJECTED':
      return action === 'book'
        ? 'Kamu sudah punya janji temu terbuka, mungkin dari perangkat lain. Daftar sudah dimuat ulang.'
        : 'Janji temu ini sudah tidak bisa dibatalkan karena statusnya sudah berubah.';
    case 'VALIDATION_FAILED':
      return action === 'book'
        ? 'Waktu yang dipilih tidak diterima. Pilih waktu lain di masa depan.'
        : 'Pembatalan tidak diterima.';
    case 'NOT_FOUND':
      return 'Janji temu tidak ditemukan. Daftar sudah dimuat ulang.';
    default:
      return action === 'book' ? 'Pemesanan gagal. Coba lagi.' : 'Pembatalan gagal. Coba lagi.';
  }
}

export default function ScheduleScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const list = useAppointments();
  const { patchRow, invalidate, refresh } = list;

  const [picked, setPicked] = useState<string | null>(null);
  // Time of a booking sent but not yet confirmed by a list reload. Never shown as booked.
  const [pendingBooking, setPendingBooking] = useState<string | null>(null);
  const [confirmingReschedule, setConfirmingReschedule] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Which failed mutation to explain. Cleared on the next action, so an old 409 never
  // lingers under a state it no longer describes.
  const [failure, setFailure] = useState<'book' | 'cancel' | null>(null);

  const book = useBookAppointment(
    (iso) => setPendingBooking(iso),
    () => setPendingBooking(null),
  );
  const cancel = useCancelAppointment(
    (a) => patchRow(a.id, { ...a, status: 'cancelled', cancelled_at: new Date().toISOString() }),
    (a) => patchRow(a.id, a),
  );

  // Local UI state follows a mutation outcome during render ("adjusting state when a
  // value changes"), not in an effect: no extra render with stale UI. Both mutations
  // start 'idle', so nothing fires on mount -- same as the effects this replaced.
  const [seenBookState, setSeenBookState] = useState(book.state);
  if (book.state !== seenBookState) {
    setSeenBookState(book.state);
    if (book.state === 'done') {
      setPicked(null);
      setRescheduling(false);
    }
    if (book.state === 'failed') setFailure('book');
  }

  const [seenCancelState, setSeenCancelState] = useState(cancel.state);
  if (cancel.state !== seenCancelState) {
    setSeenCancelState(cancel.state);
    if (cancel.state === 'failed') {
      setFailure('cancel');
      setRescheduling(false);
    }
  }

  // A mutation that landed (directly or from the offline queue) is confirmed by reloading
  // the server list, with the pre-mutation cache dropped so it cannot come back. That
  // network call is a real side effect, so it stays in an effect.
  useEffect(() => {
    if (book.state === 'done') void invalidate().finally(() => setPendingBooking(null));
    if (book.state === 'failed') void invalidate();
  }, [book.state, invalidate]);

  useEffect(() => {
    if (cancel.state === 'done' || cancel.state === 'failed') void invalidate();
  }, [cancel.state, invalidate]);

  // Invalidate on focus instead of polling: no timers burning battery and data.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false; // the mount already loaded
        return;
      }
      void refresh();
    }, [refresh]),
  );

  async function onPullRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const hasRows = list.appointments.length > 0;
  const cancelInFlight = IN_FLIGHT.includes(cancel.state);
  const bookInFlight = IN_FLIGHT.includes(book.state) || pendingBooking !== null;
  const ready = list.status === 'ready' || hasRows;
  const open = list.openAppointment;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.base }}
      contentContainerStyle={{
        gap: spacing.lg,
        padding: spacing.lg,
        paddingTop: insets.top + spacing.xl3 * 2, // clears the offline banner
        paddingBottom: insets.bottom + 84, // clears the tab bar
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.brand} />}
    >
      <AppText variant="display">Jadwal</AppText>

      {list.status === 'not-linked' ? <NotLinkedCard /> : null}

      {list.status === 'loading' && !hasRows ? (
        <Card title="Janji temu">
          <AppText tone="muted">Memuat…</AppText>
        </Card>
      ) : null}

      {list.status === 'error' && !hasRows ? (
        <Card title="Janji temu tidak dapat dimuat">
          <AppText tone="muted" testID="schedule-error">
            {list.error instanceof NetworkUnavailable
              ? 'Tidak ada koneksi dan belum ada data tersimpan.'
              : 'Terjadi kesalahan saat memuat janji temu.'}
          </AppText>
          <Button label="Coba lagi" onPress={refresh} />
        </Card>
      ) : null}

      {ready && list.status !== 'not-linked' ? (
        <>
          {open ? (
            <OpenAppointmentCard
              appointment={open}
              cancelState={cancel.state}
              confirming={confirmingReschedule}
              onCancel={() => {
                setFailure(null);
                setRescheduling(false);
                void cancel.run(open);
              }}
              onAskReschedule={() => setConfirmingReschedule(true)}
              onAbortReschedule={() => setConfirmingReschedule(false)}
              onConfirmReschedule={() => {
                setFailure(null);
                setConfirmingReschedule(false);
                setRescheduling(true);
                void cancel.run(open);
              }}
            />
          ) : cancelInFlight ? (
            <Card title="Membatalkan janji temu">
              <AppText tone="muted" testID="schedule-cancel-pending">
                {cancel.state === 'queued'
                  ? 'Menunggu koneksi. Pemesanan baru bisa dibuat setelah pembatalan terkirim.'
                  : 'Mengirim pembatalan…'}
              </AppText>
            </Card>
          ) : (
            <BookingCard
              picked={picked}
              onPick={setPicked}
              pendingBooking={pendingBooking}
              bookState={book.state}
              inFlight={bookInFlight}
              rescheduling={rescheduling}
              onBook={() => {
                if (picked === null || bookInFlight) return;
                setFailure(null);
                void book.run({ scheduledFor: picked });
              }}
            />
          )}

          {failure === 'book' ? (
            <AppText tone="soft" testID="schedule-book-error">{mutationMessage(book.error, 'book')}</AppText>
          ) : null}
          {failure === 'cancel' ? (
            <AppText tone="soft" testID="schedule-cancel-error">{mutationMessage(cancel.error, 'cancel')}</AppText>
          ) : null}

          <HistoryCard list={list} cancelQueued={cancel.state === 'queued'} />
        </>
      ) : null}
    </ScrollView>
  );
}

function OpenAppointmentCard({
  appointment,
  cancelState,
  confirming,
  onCancel,
  onAskReschedule,
  onAbortReschedule,
  onConfirmReschedule,
}: {
  appointment: Appointment;
  cancelState: OptimisticState;
  confirming: boolean;
  onCancel: () => void;
  onAskReschedule: () => void;
  onAbortReschedule: () => void;
  onConfirmReschedule: () => void;
}): React.ReactElement {
  const busy = cancelState === 'pending';
  const actionable = DONOR_ACTIONABLE_STATUSES.includes(appointment.status);

  return (
    <View testID="schedule-open">
      <Card title={actionable ? 'Janji temu berikutnya' : 'Janji temu berlangsung'}>
        <AppText variant="numeric" tone="strong">{formatAppointmentTime(appointment)}</AppText>
        <AppText tone="muted">{formatAppointmentStatus(appointment.status)}</AppText>
        {appointment.note ? <AppText tone="soft">{appointment.note}</AppText> : null}

        {!actionable ? (
          <AppText tone="soft" testID="schedule-open-onsite">{ON_SITE_NOTE[appointment.status]}</AppText>
        ) : confirming ? (
          <View style={{ gap: spacing.sm }} testID="schedule-reschedule-confirm">
            <AppText>
              Menjadwal ulang berarti janji temu ini dibatalkan lebih dulu. Setelah pembatalan berhasil,
              kamu memilih waktu baru. Kalau pemesanan baru gagal, kamu tidak punya janji temu.
            </AppText>
            <Button label="Batalkan dan pilih waktu baru" onPress={onConfirmReschedule} loading={busy} />
            <Button label="Tidak jadi" variant="ghost" onPress={onAbortReschedule} disabled={busy} />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Button label="Jadwal ulang" variant="secondary" onPress={onAskReschedule} disabled={busy} />
            <Button label="Batalkan" variant="destructive" onPress={onCancel} loading={busy} />
          </View>
        )}
      </Card>
    </View>
  );
}

function BookingCard({
  picked,
  onPick,
  pendingBooking,
  bookState,
  inFlight,
  rescheduling,
  onBook,
}: {
  picked: string | null;
  onPick: (iso: string | null) => void;
  pendingBooking: string | null;
  bookState: OptimisticState;
  inFlight: boolean;
  rescheduling: boolean;
  onBook: () => void;
}): React.ReactElement {
  return (
    <View testID="schedule-booking">
      <Card title="Pesan janji temu">
        {rescheduling ? (
          <AppText tone="soft">Janji temu lama sudah dibatalkan. Pilih waktu baru.</AppText>
        ) : null}

        {pendingBooking !== null ? (
          <View style={{ gap: spacing.xs }} testID="schedule-booking-pending">
            <AppText variant="numeric" tone="strong">{formatDateTime(pendingBooking)}</AppText>
            <AppText tone="muted">
              {bookState === 'queued'
                ? 'Menunggu koneksi. Pesanan akan dikirim otomatis; belum terkonfirmasi.'
                : 'Mengirim pesanan…'}
            </AppText>
          </View>
        ) : (
          <>
            <DateTimePicker value={picked} onChange={onPick} disabled={inFlight} />
            <AppText variant="caption" tone="muted">
              Fasilitas mengikuti pendaftaranmu. Petugas yang mengonfirmasi kedatanganmu.
            </AppText>
            <Button
              label="Pesan"
              onPress={onBook}
              disabled={picked === null}
              loading={inFlight}
              testID="schedule-book"
            />
          </>
        )}
      </Card>
    </View>
  );
}

function HistoryCard({ list, cancelQueued }: { list: AppointmentsHandle; cancelQueued: boolean }): React.ReactElement {
  const empty = list.appointments.length === 0;

  return (
    <View testID="schedule-history">
      <Card title="Riwayat janji temu">
        {list.fromCache && !empty ? (
          <AppText variant="caption" tone="muted" testID="schedule-history-cached">Data tersimpan</AppText>
        ) : null}
        {list.status === 'error' && !empty ? (
          <AppText variant="caption" tone="muted">
            {list.error instanceof NetworkUnavailable
              ? 'Tidak ada koneksi. Daftar mungkin belum terbaru.'
              : 'Daftar gagal dimuat ulang.'}
          </AppText>
        ) : null}
        {cancelQueued ? (
          <AppText variant="caption" tone="muted">Pembatalan menunggu koneksi.</AppText>
        ) : null}
        {empty ? <AppText tone="muted">Belum ada janji temu</AppText> : null}
        {list.appointments.map((appointment) => (
          <AppointmentRow key={appointment.id} appointment={appointment} />
        ))}
        {list.hasMore ? (
          <Button
            variant="ghost"
            label="Muat lebih banyak"
            loading={list.loadingMore}
            onPress={list.loadMore}
            testID="schedule-history-more"
          />
        ) : null}
      </Card>
    </View>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs }}>
      <AppText style={{ flexShrink: 1 }}>{formatAppointmentTime(appointment)}</AppText>
      <AppText variant="label" tone={OPEN_STATUSES.includes(appointment.status) ? 'strong' : 'muted'}>
        {formatAppointmentStatus(appointment.status)}
      </AppText>
    </View>
  );
}

function NotLinkedCard(): React.ReactElement {
  return (
    <View testID="schedule-not-linked">
      <Card title="Akun belum terhubung">
        <AppText>Akunmu belum terhubung ke data donor, jadi janji temu belum bisa dipesan.</AppText>
        <AppText tone="muted">Hubungi petugas di fasilitas donor darah untuk menautkan akun ini ke data donormu.</AppText>
      </Card>
    </View>
  );
}
