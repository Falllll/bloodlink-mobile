import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import { useInvitations } from '@/lib/invitations/useInvitations';
import { spacing } from '@/theme/tokens';

export function OpenInvitationsSummary(): React.ReactElement {
  const { status, invitations, fromCache, refresh } = useInvitations();

  // Answering happens on the Permintaan tab, which is a separate hook instance: reload on
  // focus so this count matches it when the donor comes back.
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

  if (status === 'not-linked') {
    return <Quiet>Panggilan donor akan muncul di sini setelah akunmu terhubung.</Quiet>;
  }
  if (status === 'loading') {
    return <Quiet>Memuat panggilan donor…</Quiet>;
  }
  if (status === 'error') {
    return <Quiet>Panggilan donor belum bisa dimuat.</Quiet>;
  }

  const openCount = invitations.filter((invitation) => invitation.is_open).length;

  if (openCount === 0) {
    return <Quiet>Tidak ada panggilan donor yang menunggu jawabanmu.</Quiet>;
  }

  return (
    <View testID="home-invitations">
      <Card title="Panggilan donor">
        {fromCache ? (
          <AppText variant="caption" tone="muted" testID="home-invitations-cached">Data tersimpan</AppText>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <AppText variant="numeric" tone="strong" testID="home-invitations-count">
            {String(openCount)}
          </AppText>
          <AppText variant="label" tone="muted">menunggu jawabanmu</AppText>
        </View>
        <Button label="Lihat permintaan" onPress={() => router.push('/requests')} testID="home-invitations-open" />
      </Card>
    </View>
  );
}

function Quiet({ children }: { children: string }): React.ReactElement {
  return (
    <View testID="home-invitations">
      <AppText tone="muted">{children}</AppText>
    </View>
  );
}
