import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import type { ApiFailure } from '@/lib/api/client';
import type { OptimisticState } from '@/lib/api/useOptimisticMutation';
import { COMPONENT_LABEL, URGENCY_LABEL, formatDateTime, formatDistance, formatTimeLeft } from '@/lib/donor/format';
import type { CampaignResponse, Invitation, RequestUrgency } from '@/lib/invitations/types';
import { sortInvitations, useInvitations } from '@/lib/invitations/useInvitations';
import { useRespondToInvitation } from '@/lib/invitations/useRespondToInvitation';
import { colors, spacing } from '@/theme/tokens';

/**
 * Branches on error.code only; error.message is neither stable nor localized.
 * CAMPAIGN_REJECTED covers two causes (already answered, campaign ended) under one code,
 * so it gets one sentence that is true for both instead of a guess at which one it was.
 */
export function respondMessage(error: ApiFailure | null): string {
  switch (error?.body?.error?.code) {
    case 'CAMPAIGN_REJECTED':
      return 'Undangan ini sudah tidak bisa dijawab. Daftar sudah dimuat ulang.';
    case 'NOT_FOUND':
      return 'Undangan tidak ditemukan atau sudah ditutup. Daftar sudah dimuat ulang.';
    case 'VALIDATION_FAILED':
      return 'Jawaban tidak diterima.';
    default:
      return 'Jawaban gagal dikirim. Coba lagi.';
  }
}

/**
 * Optimistic answers keyed by invitation id, laid over the server rows. A row with an
 * answer here is shown answered and closed until the reloaded list confirms it.
 */
export function useAnsweredOverlay(rows: Invitation[]) {
  const [answered, setAnswered] = useState<Record<string, CampaignResponse>>({});

  const apply = useCallback((id: string, response: CampaignResponse) => {
    setAnswered((current) => ({ ...current, [id]: response }));
  }, []);

  const rollback = useCallback((id: string) => {
    setAnswered((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const merged = useMemo(
    () =>
      sortInvitations(
        rows.map((row) => {
          const response = answered[row.id];
          return response === undefined ? row : { ...row, response, is_open: false };
        }),
      ),
    [rows, answered],
  );

  return { merged, apply, rollback };
}

const IN_FLIGHT: readonly OptimisticState[] = ['pending', 'queued'];

export default function RequestsScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const list = useInvitations();
  const { invalidate, refresh } = list;
  const overlay = useAnsweredOverlay(list.invitations);
  const respond = useRespondToInvitation(overlay.apply, overlay.rollback);

  const [now, setNow] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);
  // Cleared on the next answer, so an old 409 never lingers under a state it no longer describes.
  const [failed, setFailed] = useState(false);

  const [seenRespondState, setSeenRespondState] = useState(respond.state);
  if (respond.state !== seenRespondState) {
    setSeenRespondState(respond.state);
    if (respond.state === 'failed') setFailed(true);
  }

  // An answer that landed (directly or from the offline queue), or one the server refused,
  // is confirmed by reloading the list with the pre-answer cache dropped.
  useEffect(() => {
    if (respond.state === 'done' || respond.state === 'failed') void invalidate();
  }, [respond.state, invalidate]);

  // Invalidate on focus instead of polling: no timers burning battery and data.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      if (firstFocus.current) {
        firstFocus.current = false; // the mount already loaded
        return;
      }
      void refresh();
    }, [refresh]),
  );

  async function onPullRefresh() {
    setRefreshing(true);
    setNow(new Date());
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  function answer(id: string, response: CampaignResponse) {
    if (IN_FLIGHT.includes(respond.state)) return;
    setFailed(false);
    void respond.run({ id, response });
  }

  const rows = overlay.merged;
  const hasRows = rows.length > 0;

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
      <AppText variant="display">Permintaan</AppText>

      {list.status === 'not-linked' ? (
        <View testID="requests-not-linked">
          <Card title="Akun belum terhubung">
            <AppText>Akunmu belum terhubung ke data donor, jadi belum ada panggilan donor untukmu.</AppText>
            <AppText tone="muted">Hubungi petugas di fasilitas donor darah untuk menautkan akun ini ke data donormu.</AppText>
          </Card>
        </View>
      ) : null}

      {list.status === 'loading' && !hasRows ? (
        <Card title="Panggilan donor">
          <AppText tone="muted" testID="requests-loading">Memuat…</AppText>
        </Card>
      ) : null}

      {list.status === 'error' && !hasRows ? (
        <Card title="Panggilan donor tidak dapat dimuat">
          <AppText tone="muted" testID="requests-error">
            {list.error === null
              ? 'Tidak ada koneksi dan belum ada data tersimpan.'
              : 'Terjadi kesalahan saat memuat panggilan donor.'}
          </AppText>
          <Button label="Coba lagi" onPress={refresh} />
        </Card>
      ) : null}

      {list.status === 'ready' ? (
        <>
          <RespondFeedback state={respond.state} failed={failed} error={respond.error} prefix="requests" />

          {list.fromCache && hasRows ? (
            <AppText variant="caption" tone="muted" testID="requests-cached">Data tersimpan</AppText>
          ) : null}

          {!hasRows ? (
            <View testID="requests-empty">
              <Card title="Belum ada panggilan donor">
                <AppText tone="muted">Panggilan donor darurat yang ditujukan kepadamu akan muncul di sini.</AppText>
              </Card>
            </View>
          ) : null}

          {rows.map((invitation) => (
            <Pressable
              key={invitation.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/requests/[id]', params: { id: invitation.id } })}
            >
              <View testID={invitation.is_open ? 'requests-open' : 'requests-answered'}>
                <Card title={invitation.facility_name}>
                  <InvitationFacts invitation={invitation} now={now} />
                  {invitation.is_open ? (
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Button
                        label="Bersedia"
                        style={{ flex: 1 }}
                        disabled={IN_FLIGHT.includes(respond.state)}
                        onPress={() => answer(invitation.id, 'accepted')}
                      />
                      <Button
                        label="Tolak"
                        variant="secondary"
                        style={{ flex: 1 }}
                        disabled={IN_FLIGHT.includes(respond.state)}
                        onPress={() => answer(invitation.id, 'declined')}
                      />
                    </View>
                  ) : (
                    <AnswerLine invitation={invitation} />
                  )}
                </Card>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

/** Pending, queued and failed answers; testIDs are `<prefix>-respond-<state>`. */
export function RespondFeedback({
  state,
  failed,
  error,
  prefix,
}: {
  state: OptimisticState;
  failed: boolean;
  error: ApiFailure | null;
  prefix: string;
}): React.ReactElement | null {
  if (state === 'pending') {
    return <AppText tone="muted" testID={`${prefix}-respond-pending`}>Mengirim jawaban…</AppText>;
  }
  if (state === 'queued') {
    return (
      <AppText tone="muted" testID={`${prefix}-respond-queued`}>
        Menunggu koneksi. Jawabanmu akan dikirim otomatis.
      </AppText>
    );
  }
  if (failed) {
    return <AppText tone="soft" testID={`${prefix}-respond-error`}>{respondMessage(error)}</AppText>;
  }
  return null;
}

/** Only what the payload carries: no blood type, no amount, no coordinates. */
export function InvitationFacts({ invitation, now }: { invitation: Invitation; now: Date }): React.ReactElement {
  return (
    <View style={{ gap: spacing.xs }}>
      <UrgencyChip urgency={invitation.urgency} />
      <AppText tone="strong">{COMPONENT_LABEL[invitation.component]}</AppText>
      <AppText tone="muted">
        {`Dibutuhkan ${formatDateTime(invitation.needed_by)} · ${formatTimeLeft(invitation.needed_by, now)}`}
      </AppText>
      {/* A snapshot from when the donor was contacted; it does not follow the donor. */}
      <AppText tone="muted">{`± ${formatDistance(invitation.distance_meters)} dari lokasimu saat dihubungi`}</AppText>
    </View>
  );
}

export function AnswerLine({ invitation }: { invitation: Invitation }): React.ReactElement {
  if (invitation.response === 'accepted') {
    return (
      <AppText tone="strong">Kamu bersedia datang. Petugas di fasilitas akan memandumu seperti donor biasa.</AppText>
    );
  }
  if (invitation.response === 'declined') {
    return <AppText tone="muted">Kamu menolak panggilan ini.</AppText>;
  }
  return <AppText tone="muted">Panggilan ini sudah ditutup.</AppText>;
}

// Not StatusChip: that one is typed to inventory batch statuses and their colors.
const URGENCY_COLOR: Record<RequestUrgency, string> = {
  emergency: colors.brand,
  urgent: colors.ink.strong,
  routine: colors.ink.muted,
};

function UrgencyChip({ urgency }: { urgency: RequestUrgency }): React.ReactElement {
  const fg = URGENCY_COLOR[urgency];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: `${fg}2E`, // 18% alpha, same mix as StatusChip
        borderRadius: 999,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      <AppText variant="label" style={{ color: fg, textTransform: 'uppercase' }}>
        {URGENCY_LABEL[urgency]}
      </AppText>
    </View>
  );
}
