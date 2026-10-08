import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AppText } from '@/components/ui/Text';
import { useOffline } from '@/lib/api/offline';
import { colors, radii, spacing } from '@/theme/tokens';

export function OfflineBanner(): React.ReactElement | null {
  const { online, pending, flushing, flushNow } = useOffline();

  if (online && pending === 0) return null;

  const message = [
    online ? null : 'Tidak ada koneksi',
    pending > 0 ? `${pending} aksi menunggu dikirim` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <GlassPanel
      surface="flat"
      radius={radii.xl}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
      }}
      testID="offline-banner"
    >
      <View
        style={{
          width: spacing.sm,
          height: spacing.sm,
          borderRadius: radii.sm,
          backgroundColor: online ? colors.status.TESTING : colors.brand,
        }}
      />
      <AppText variant="label" style={{ flex: 1 }} accessibilityLiveRegion="polite">
        {message}
      </AppText>
      <Button variant="ghost" size="md" label="Coba lagi" onPress={flushNow} loading={flushing} />
    </GlassPanel>
  );
}
