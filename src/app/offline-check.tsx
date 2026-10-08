import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { AppText } from '@/components/ui/Text';
import { useCachedQuery } from '@/lib/api/cache';
import type { ApiSuccess } from '@/lib/api/types';
import { useOptimisticMutation, type OptimisticState } from '@/lib/api/useOptimisticMutation';
import { colors, spacing } from '@/theme/tokens';

type Appointment = { id: string; donor_id: string; status: string; scheduled_for: string | null };
type DeferralReason = { code: string; label: string };
type StatusVars = { id: string; status: string };
type WalkInVars = { donorId: string };

const NEXT_STATUS: Record<string, string[]> = {
  booked: ['arrived', 'cancelled'],
  arrived: ['screened', 'cancelled'],
  screened: ['completed', 'cancelled'],
};

export default function OfflineCheckRoute() {
  // Dev-only verification harness for the offline layer: a release build must never reach it.
  if (!__DEV__) return null;
  return <OfflineCheckScreen />;
}

function OfflineCheckScreen() {
  const insets = useSafeAreaInsets();
  const [donorId, setDonorId] = useState('');
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});
  const [optimisticWalkIns, setOptimisticWalkIns] = useState<string[]>([]);

  const appointments = useCachedQuery<ApiSuccess<Appointment[]>>('/appointments');
  const reasons = useCachedQuery<ApiSuccess<DeferralReason[]>>('/deferral-reasons');

  const statusMutation = useOptimisticMutation<StatusVars>({
    path: (vars) => `/appointments/${vars.id}/status`,
    method: 'PATCH',
    body: (vars) => ({ status: vars.status }),
    apply: (vars) => setOptimisticStatus((current) => ({ ...current, [vars.id]: vars.status })),
    rollback: (vars) =>
      setOptimisticStatus((current) => {
        const next = { ...current };
        delete next[vars.id];
        return next;
      }),
  });

  const walkInMutation = useOptimisticMutation<WalkInVars>({
    path: (vars) => `/donors/${vars.donorId}/appointments`,
    method: 'POST',
    body: () => ({ note: 'offline-check' }), // no scheduled_for: a walk-in, born as `arrived`
    apply: (vars) => setOptimisticWalkIns((current) => [...current, vars.donorId]),
    rollback: (vars) =>
      setOptimisticWalkIns((current) => current.filter((id) => id !== vars.donorId)),
  });

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
      <AppText variant="display">Offline check</AppText>

      <Card title="Hasil mutasi">
        <MutationLine name="PATCH status" state={statusMutation.state} code={statusMutation.error?.body.error.code} />
        <MutationLine name="POST walk-in" state={walkInMutation.state} code={walkInMutation.error?.body.error.code} />
      </Card>

      <Card title="GET /deferral-reasons">
        <SourceLine fromCache={reasons.fromCache} cachedAt={reasons.cachedAt} loading={reasons.loading} />
        <AppText testID="reasons-count">{`${reasons.data?.data.length ?? 0} alasan`}</AppText>
        {reasons.error ? <AppText tone="muted">{`error: ${reasons.error.message}`}</AppText> : null}
        <Button variant="ghost" label="Muat ulang alasan" onPress={reasons.refresh} />
      </Card>

      <Card title="Walk-in baru">
        <Field label="Donor public_id" value={donorId} onChangeText={setDonorId} autoCapitalize="none" />
        <Button
          label="Catat walk-in"
          onPress={() => walkInMutation.run({ donorId: donorId.trim() })}
          disabled={donorId.trim() === ''}
        />
        {optimisticWalkIns.map((id) => (
          <AppText key={id} tone="soft" testID="optimistic-walk-in">{`walk-in ${id} (optimistis)`}</AppText>
        ))}
      </Card>

      <Card title="GET /appointments">
        <SourceLine fromCache={appointments.fromCache} cachedAt={appointments.cachedAt} loading={appointments.loading} />
        {appointments.error ? <AppText tone="muted">{`error: ${appointments.error.message}`}</AppText> : null}
        <Button variant="ghost" label="Muat ulang janji temu" onPress={appointments.refresh} />
        {(appointments.data?.data ?? []).map((appointment) => {
          const pending = optimisticStatus[appointment.id];
          return (
            <View key={appointment.id} style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
              <AppText variant="label" selectable>{appointment.id}</AppText>
              <AppText testID={`status-${appointment.id}`}>
                {pending ? `${appointment.status} → ${pending} (optimistis)` : appointment.status}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {(NEXT_STATUS[appointment.status] ?? []).map((status) => (
                  <Button
                    key={status}
                    variant="secondary"
                    label={`→ ${status}`}
                    onPress={() => statusMutation.run({ id: appointment.id, status })}
                  />
                ))}
                <Button
                  variant="destructive"
                  label="→ status tidak valid"
                  onPress={() => statusMutation.run({ id: appointment.id, status: 'not-a-status' })}
                />
              </View>
            </View>
          );
        })}
      </Card>
    </ScrollView>
  );
}

function MutationLine({ name, state, code }: { name: string; state: OptimisticState; code?: string }) {
  return (
    <AppText testID={`mutation-${name}`}>{`${name}: ${state}${code ? ` (${code})` : ''}`}</AppText>
  );
}

function SourceLine({ fromCache, cachedAt, loading }: { fromCache: boolean; cachedAt: number | null; loading: boolean }) {
  if (loading) return <AppText tone="muted">memuat…</AppText>;
  const time = cachedAt ? new Date(cachedAt).toLocaleTimeString() : '-';
  return (
    <AppText tone={fromCache ? 'strong' : 'muted'} testID="source">
      {fromCache ? `fromCache · disimpan ${time}` : `dari server · ${time}`}
    </AppText>
  );
}
