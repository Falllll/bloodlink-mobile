import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import { NetworkUnavailable } from '@/lib/api/client';
import { useSession } from '@/lib/auth/session';
import { useDevicePush } from '@/lib/devices/useDevicePush';
import { formatBloodType, formatDateOnly, formatDateTime, formatVolume } from '@/lib/donor/format';
import type { Donation, DonorProfile, Sex } from '@/lib/donor/types';
import { useDonationHistory } from '@/lib/donor/useDonationHistory';
import { useDonorProfile } from '@/lib/donor/useDonorProfile';
import { colors, spacing } from '@/theme/tokens';

const SEX_LABEL: Record<Sex, string> = { male: 'Laki-laki', female: 'Perempuan' };

export default function ProfileScreen(): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { status, profile, error, reload } = useDonorProfile();
  const history = useDonationHistory();
  const { signOut } = useSession();
  const [leaving, setLeaving] = useState(false);

  async function handleSignOut() {
    setLeaving(true);
    try {
      await signOut();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.base }}
      contentContainerStyle={{
        gap: spacing.lg,
        padding: spacing.lg,
        paddingTop: insets.top + spacing.xl3 * 2, // clears the offline banner
        paddingBottom: insets.bottom + 84, // clears the tab bar
      }}
    >
      <AppText variant="display">Profil</AppText>

      {status === 'loading' ? (
        <Card title="Identitas donor">
          <AppText tone="muted">Memuat…</AppText>
        </Card>
      ) : null}

      {status === 'not-linked' ? <NotLinkedCard /> : null}

      {status === 'error' ? (
        <Card title="Profil tidak dapat dimuat">
          <AppText tone="muted" testID="profile-error">
            {error instanceof NetworkUnavailable
              ? 'Tidak ada koneksi. Data profil tidak disimpan di perangkat, jadi hanya bisa dimuat saat online.'
              : 'Terjadi kesalahan saat memuat profil.'}
          </AppText>
          <Button label="Coba lagi" onPress={reload} />
        </Card>
      ) : null}

      {status === 'ready' && profile ? (
        <>
          <IdentityCard profile={profile} />
          <ContactCard profile={profile} />
          <DonationSummaryCard profile={profile} />
        </>
      ) : null}

      {status === 'not-linked' ? null : <HistoryCard history={history} />}

      <NotificationCard />

      <Button label="Keluar" variant="destructive" onPress={handleSignOut} loading={leaving} />
    </ScrollView>
  );
}

function IdentityCard({ profile }: { profile: DonorProfile }): React.ReactElement {
  return (
    <View testID="profile-identity">
      <Card title="Identitas donor">
        <InfoRow label="Nomor donor" value={profile.donor_number} testID="profile-donor-number" />
        <InfoRow label="Nama lengkap" value={profile.full_name} />
        <InfoRow label="Tanggal lahir" value={formatDateOnly(profile.date_of_birth)} testID="profile-date-of-birth" />
        <InfoRow label="Jenis kelamin" value={SEX_LABEL[profile.sex]} />
        <InfoRow label="Golongan darah" value={formatBloodType(profile.blood_group, profile.rh_factor)} />
        <InfoRow label="Berat badan" value={profile.weight_kg === null ? '—' : `${profile.weight_kg} kg`} />
        <InfoRow label="Kota" value={profile.city} />
      </Card>
    </View>
  );
}

function ContactCard({ profile }: { profile: DonorProfile }): React.ReactElement {
  return (
    <Card title="Kontak">
      <InfoRow label="Telepon" value={profile.phone} />
      <InfoRow label="Email" value={profile.email ?? '—'} />
      <InfoRow label="Alamat" value={profile.address} />
    </Card>
  );
}

function DonationSummaryCard({ profile }: { profile: DonorProfile }): React.ReactElement {
  return (
    <Card title="Ringkasan">
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
        <AppText variant="numeric" tone="strong" testID="profile-donation-count">
          {String(profile.donation_count)}
        </AppText>
        <AppText variant="label" tone="muted">kali donasi</AppText>
      </View>
      <InfoRow
        label="Donasi terakhir"
        value={profile.last_donation_date === null ? 'Belum ada donasi' : formatDateOnly(profile.last_donation_date)}
        testID="profile-last-donation"
      />
    </Card>
  );
}

function HistoryCard({ history }: { history: ReturnType<typeof useDonationHistory> }): React.ReactElement {
  const empty = history.donations.length === 0;

  return (
    <View testID="profile-history">
      <Card title="Riwayat donasi">
        {history.fromCache && !empty ? (
          <AppText variant="caption" tone="muted" testID="profile-history-cached">Data tersimpan</AppText>
        ) : null}
        {history.loading && empty ? <AppText tone="muted">Memuat…</AppText> : null}
        {history.error ? (
          <AppText tone="muted" testID="profile-history-error">
            {history.error instanceof NetworkUnavailable
              ? 'Tidak ada koneksi. Riwayat donasi belum bisa dimuat.'
              : 'Riwayat donasi gagal dimuat.'}
          </AppText>
        ) : null}
        {!history.loading && !history.error && empty ? (
          <AppText tone="muted">Belum ada donasi tercatat</AppText>
        ) : null}
        {history.donations.map((donation) => (
          <DonationRow key={donation.id} donation={donation} />
        ))}
        {history.hasMore ? (
          <Button
            variant="ghost"
            label="Muat lebih banyak"
            loading={history.loadingMore}
            onPress={history.loadMore}
            testID="profile-history-more"
          />
        ) : null}
      </Card>
    </View>
  );
}

function DonationRow({ donation }: { donation: Donation }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs }}>
      <AppText>{formatDateTime(donation.completed_at)}</AppText>
      <AppText variant="numeric" tone="strong">{formatVolume(donation.volume_ml)}</AppText>
    </View>
  );
}

function NotificationCard(): React.ReactElement {
  const { enrollment, enable } = useDevicePush();
  const [busy, setBusy] = useState(false);

  // The permission prompt only ever comes from this button press, never on mount.
  async function handleEnable() {
    setBusy(true);
    try {
      await enable();
    } finally {
      setBusy(false);
    }
  }

  let body: React.ReactElement;
  if (enrollment.state === 'unsupported') {
    body = (
      <AppText tone="muted" testID="notifications-unsupported">
        Perangkat ini tidak mendukung notifikasi push (emulator, simulator, atau Expo Go).
      </AppText>
    );
  } else if (enrollment.state === 'granted' && enrollment.registered) {
    body = (
      <AppText testID="notifications-registered" style={{ color: colors.brandText }}>
        Notifikasi aktif. Panggilan donor darurat akan dikirim ke perangkat ini.
      </AppText>
    );
  } else if (enrollment.state === 'denied' && !enrollment.canAskAgain) {
    // The OS will not show the prompt again; a retry button here would do nothing.
    body = (
      <>
        <AppText tone="muted" testID="notifications-blocked">
          Izin notifikasi ditolak. Aktifkan lewat pengaturan perangkat untuk menerima panggilan donor darurat.
        </AppText>
        <Button variant="ghost" label="Buka pengaturan" onPress={() => Linking.openSettings()} />
      </>
    );
  } else if (enrollment.state === 'denied') {
    body = (
      <>
        <AppText tone="muted" testID="notifications-denied">
          Izin notifikasi belum diberikan. Tanpa izin ini, panggilan donor darurat tidak akan sampai.
        </AppText>
        <Button label="Coba lagi" onPress={handleEnable} loading={busy} />
      </>
    );
  } else if (enrollment.state === 'granted') {
    body = (
      <>
        <AppText tone="muted" testID="notifications-unregistered">
          Izin sudah diberikan, tetapi perangkat ini belum terdaftar.
        </AppText>
        <Button label="Daftarkan perangkat" onPress={handleEnable} loading={busy} />
      </>
    );
  } else {
    body = (
      <>
        <AppText tone="muted" testID="notifications-off">
          Terima panggilan donor darurat di dekatmu lewat notifikasi.
        </AppText>
        <Button label="Aktifkan notifikasi" onPress={handleEnable} loading={busy} />
      </>
    );
  }

  return (
    <View testID="profile-notifications">
      <Card title="Notifikasi">{body}</Card>
    </View>
  );
}

function NotLinkedCard(): React.ReactElement {
  return (
    <View testID="profile-not-linked">
      <Card title="Akun belum terhubung">
        <AppText>Akunmu belum terhubung ke data donor, jadi profil dan riwayat donasi belum bisa ditampilkan.</AppText>
        <AppText tone="muted">Hubungi petugas di fasilitas donor darah untuk menautkan akun ini ke data donormu.</AppText>
      </Card>
    </View>
  );
}

function InfoRow({ label, value, testID }: { label: string; value: string; testID?: string }): React.ReactElement {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
      <AppText variant="label" tone="muted">{label}</AppText>
      <AppText variant="body" testID={testID} selectable style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}
