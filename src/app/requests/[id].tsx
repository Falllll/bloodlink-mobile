import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnswerLine, InvitationFacts, RespondFeedback, useAnsweredOverlay } from '@/app/(tabs)/requests';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import type { OptimisticState } from '@/lib/api/useOptimisticMutation';
import { formatDateTime } from '@/lib/donor/format';
import type { CampaignResponse } from '@/lib/invitations/types';
import { useInvitations } from '@/lib/invitations/useInvitations';
import { useRespondToInvitation } from '@/lib/invitations/useRespondToInvitation';
import { colors, spacing } from '@/theme/tokens';

const IN_FLIGHT: readonly OptimisticState[] = ['pending', 'queued'];

export default function RequestDetailScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useInvitations();
  const { invalidate, refresh } = list;
  const overlay = useAnsweredOverlay(list.invitations);
  const respond = useRespondToInvitation(overlay.apply, overlay.rollback);

  const [now] = useState(() => new Date());
  const [failed, setFailed] = useState(false);
  // There is no GET /me/campaign-invitations/{contact}: the row only exists inside the list.
  // A cold start from a notification may hold a cached list without it, so reload once.
  const retryStarted = useRef(false);
  const [retried, setRetried] = useState(false);

  const invitation = overlay.merged.find((row) => row.id === id) ?? null;

  useEffect(() => {
    if (list.status !== 'ready' || invitation !== null || retryStarted.current) return;
    retryStarted.current = true;
    void refresh().finally(() => setRetried(true));
  }, [list.status, invitation, refresh]);

  const [seenRespondState, setSeenRespondState] = useState(respond.state);
  if (respond.state !== seenRespondState) {
    setSeenRespondState(respond.state);
    if (respond.state === 'failed') setFailed(true);
  }

  useEffect(() => {
    if (respond.state === 'done' || respond.state === 'failed') void invalidate();
  }, [respond.state, invalidate]);

  function answer(response: CampaignResponse) {
    if (invitation === null || IN_FLIGHT.includes(respond.state)) return;
    setFailed(false);
    void respond.run({ id: invitation.id, response });
  }

  const settled = list.status === 'not-linked' || list.status === 'error' || (list.status === 'ready' && retried);
  const missing = invitation === null && settled;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.base }}
      contentContainerStyle={{ gap: spacing.lg, padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl3 }}
    >
      {invitation === null && !missing ? (
        <AppText tone="muted" testID="request-detail-loading">Memuat…</AppText>
      ) : null}

      {missing ? (
        <View testID="request-detail-missing">
          <Card title="Undangan tidak ditemukan atau sudah ditutup">
            <AppText tone="muted">Undangan ini tidak ada di daftar panggilan donormu.</AppText>
            <Button label="Muat ulang" variant="secondary" onPress={refresh} />
          </Card>
        </View>
      ) : null}

      {invitation !== null ? (
        <View testID="request-detail" style={{ gap: spacing.lg }}>
          <Card title={invitation.facility_name}>
            <InvitationFacts invitation={invitation} now={now} />
            <AppText variant="caption" tone="muted">{`Dihubungi ${formatDateTime(invitation.contacted_at)}`}</AppText>
          </Card>

          <View testID="request-detail-respond" style={{ gap: spacing.sm }}>
            <RespondFeedback state={respond.state} failed={failed} error={respond.error} prefix="request-detail" />
            {invitation.is_open ? (
              <>
                <Button
                  label="Bersedia"
                  size="lg"
                  disabled={IN_FLIGHT.includes(respond.state)}
                  onPress={() => answer('accepted')}
                />
                <Button
                  label="Tolak"
                  variant="secondary"
                  size="lg"
                  disabled={IN_FLIGHT.includes(respond.state)}
                  onPress={() => answer('declined')}
                />
              </>
            ) : (
              <AnswerLine invitation={invitation} />
            )}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
