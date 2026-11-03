import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import { useDevicePush, type PushEnrollment } from '@/lib/devices/useDevicePush';
import type { DonorLocationHandle } from '@/lib/location/useDonorLocation';
import { useDonorLocation } from '@/lib/location/useDonorLocation';
import { spacing } from '@/theme/tokens';

export function PermissionSummary(): React.ReactElement {
  const { enrollment, refresh: refreshPush } = useDevicePush();
  // useDonorLocation only reads permissions on mount and its refresh() takes a GPS fix, so
  // remounting the row is how the status is re-read without touching the location hardware.
  const [locationRead, setLocationRead] = useState(0);

  const reread = useCallback(() => {
    setLocationRead((count) => count + 1);
    void refreshPush();
  }, [refreshPush]);

  // Permissions change on the Profil tab (notifications) and in the OS settings (both).
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false; // the mount already read them
        return;
      }
      reread();
    }, [reread]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') reread();
    });
    return () => subscription.remove();
  }, [reread]);

  return (
    <View testID="home-permissions">
      <Card title="Izin perangkat">
        <NotificationRow enrollment={enrollment} />
        <LocationRow key={locationRead} />
      </Card>
    </View>
  );
}

function NotificationRow({ enrollment }: { enrollment: PushEnrollment }): React.ReactElement {
  return (
    <View style={{ gap: spacing.xs }} testID="home-permissions-notifications">
      <AppText variant="label" tone="muted">Notifikasi</AppText>
      <AppText tone="strong">{notificationStatus(enrollment)}</AppText>
      {needsNotificationAction(enrollment) ? (
        <>
          <AppText tone="muted">Tanpa izin ini, panggilan donor darurat tidak akan sampai kepadamu.</AppText>
          <Button variant="ghost" label="Atur di Profil" onPress={() => router.push('/profile')} />
        </>
      ) : null}
    </View>
  );
}

function notificationStatus(enrollment: PushEnrollment): string {
  switch (enrollment.state) {
    case 'unsupported':
      return 'Tidak didukung di perangkat ini';
    case 'unknown':
      return 'Belum diaktifkan';
    case 'denied':
      return 'Ditolak';
    case 'granted':
      return enrollment.registered ? 'Aktif' : 'Diizinkan, perangkat belum terdaftar';
  }
}

function needsNotificationAction(enrollment: PushEnrollment): boolean {
  if (enrollment.state === 'unsupported') return false; // nothing the donor can do about it
  return !(enrollment.state === 'granted' && enrollment.registered);
}

function LocationRow(): React.ReactElement {
  const location = useDonorLocation();
  const view = locationStatus(location);

  return (
    <View style={{ gap: spacing.xs }} testID="home-permissions-location">
      <AppText variant="label" tone="muted">Lokasi</AppText>
      <AppText tone="strong">{view.label}</AppText>
      {view.actionable ? (
        <>
          <AppText tone="muted">Lokasi dipakai untuk menemukan panggilan donor di dekatmu.</AppText>
          <Button variant="ghost" label="Buka pengaturan" onPress={location.openSettings} />
        </>
      ) : null}
    </View>
  );
}

// Reads permission, not status: 'unavailable' also means "granted but no fix yet", which must
// not read as a missing permission. Status only supplies the still-checking state.
function locationStatus(location: DonorLocationHandle): { label: string; actionable: boolean } {
  if (location.status === 'checking') return { label: 'Memeriksa…', actionable: false };
  if (!location.permission.servicesEnabled) return { label: 'Layanan lokasi mati', actionable: true };

  switch (location.permission.level) {
    case 'foreground':
    case 'background':
      return { label: 'Diizinkan', actionable: false };
    case 'denied':
      return { label: 'Ditolak', actionable: true };
    case 'undetermined':
      return { label: 'Belum diizinkan', actionable: true };
  }
}
