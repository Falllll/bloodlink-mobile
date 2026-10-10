import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import { useDonorLocation } from '@/lib/location/useDonorLocation';
import { clearLocationData, readMetrics, type LocationMetrics } from '@/lib/location/store';
import { colors, spacing } from '@/theme/tokens';

export default function LocationCheckRoute() {
  // Dev-only verification harness for the location layer: a release build must never reach it.
  if (!__DEV__) return null;
  return <LocationCheckScreen />;
}

function formatTime(at: number | null | undefined): string {
  return at ? new Date(at).toLocaleTimeString() : '-';
}

function LocationCheckScreen() {
  const insets = useSafeAreaInsets();
  const location = useDonorLocation();
  const [metrics, setMetrics] = useState<LocationMetrics | null>(null);
  const [busy, setBusy] = useState(false);

  // Reading metrics is a local KV read, never a location call: safe to run on mount.
  useEffect(() => {
    void readMetrics().then(setMetrics);
  }, []);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      console.warn('[location-check] action failed', error);
    } finally {
      setMetrics(await readMetrics());
      setBusy(false);
    }
  };

  const { permission, last } = location;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.base }}
      contentContainerStyle={{
        gap: spacing.lg,
        padding: spacing.lg,
        paddingTop: insets.top + spacing.xl3 * 2, // clears the offline banner
        paddingBottom: insets.bottom + spacing.xl3,
      }}
    >
      <AppText variant="display">Location check</AppText>

      <Card title="Izin & status">
        <AppText testID="location-permission">
          {`izin: ${permission.level} · canAskAgain: ${permission.canAskAgain} · layanan: ${
            permission.servicesEnabled ? 'aktif' : 'mati'
          }`}
        </AppText>
        <AppText tone="strong" testID="location-status">{`status: ${location.status}`}</AppText>
        <AppText testID="location-background">{`backgroundOn: ${location.backgroundOn}`}</AppText>
      </Card>

      <Card title="Lokasi terakhir">
        <AppText testID="location-last" selectable>
          {last
            ? `${last.latitude.toFixed(5)}, ${last.longitude.toFixed(5)} · ±${
                last.accuracy !== null ? Math.round(last.accuracy) : '?'
              } m · ${last.source} · ${formatTime(last.capturedAt)}`
            : 'belum ada lokasi'}
        </AppText>
        <MetricsLine metrics={metrics} />
      </Card>

      <Card title="Aksi">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button label="Minta izin foreground" loading={busy} onPress={() => run(location.grantForeground)} />
          <Button
            variant="secondary"
            label="Minta izin background"
            loading={busy}
            onPress={() => run(location.grantBackground)}
          />
          <Button variant="secondary" label="Ambil lokasi" loading={busy} onPress={() => run(() => location.refresh())} />
          <Button
            variant="secondary"
            label="Ambil lokasi (force)"
            loading={busy}
            onPress={() => run(() => location.refresh({ force: true }))}
          />
          <Button
            variant="ghost"
            label={location.backgroundOn ? 'Matikan background' : 'Nyalakan background'}
            loading={busy}
            onPress={() => run(() => location.setBackground(!location.backgroundOn))}
          />
          <Button variant="ghost" label="Buka pengaturan OS" onPress={location.openSettings} />
          <Button variant="destructive" label="Reset data lokasi" loading={busy} onPress={() => run(clearLocationData)} />
        </View>
      </Card>
    </ScrollView>
  );
}

function MetricsLine({ metrics }: { metrics: LocationMetrics | null }): React.ReactElement {
  return (
    <AppText testID="location-metrics">
      {`${metrics?.updates ?? 0} update · pertama ${formatTime(metrics?.firstAt)} · terakhir ${formatTime(metrics?.lastAt)}`}
    </AppText>
  );
}
