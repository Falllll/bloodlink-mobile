import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Text';
import { NetworkUnavailable } from '@/lib/api/client';
import { formatDateOnly } from '@/lib/donor/format';
import { findingSentence } from '@/lib/eligibility/finding-copy';
import type { DonorEligibility, EligibilityOutcome } from '@/lib/eligibility/types';
import { useEligibility } from '@/lib/eligibility/useEligibility';
import { colors, spacing } from '@/theme/tokens';

export function EligibilityCard(): React.ReactElement {
  const { status, eligibility, error, reload } = useEligibility();

  return (
    <View testID="home-eligibility">
      <Card title="Status donor">
        {status === 'loading' ? <AppText tone="muted">Memuat…</AppText> : null}

        {status === 'not-linked' ? (
          <View testID="home-eligibility-not-linked" style={{ gap: spacing.sm }}>
            <AppText>Akunmu belum terhubung ke data donor, jadi status kelayakanmu belum bisa ditampilkan.</AppText>
            <AppText tone="muted">Hubungi petugas di fasilitas donor darah untuk menautkan akun ini ke data donormu.</AppText>
          </View>
        ) : null}

        {status === 'error' ? (
          <>
            {error instanceof NetworkUnavailable ? (
              <AppText tone="muted" testID="home-offline">
                Tidak ada koneksi. Status kelayakan tidak disimpan di perangkat, jadi hanya bisa dimuat saat online.
              </AppText>
            ) : (
              <AppText tone="muted" testID="home-eligibility-error">
                Terjadi kesalahan saat memuat status kelayakan.
              </AppText>
            )}
            <Button label="Coba lagi" onPress={reload} />
          </>
        ) : null}

        {status === 'ready' && eligibility ? <OutcomeView eligibility={eligibility} /> : null}
      </Card>
    </View>
  );
}

// Three explicit branches, no default: a fourth outcome must fail tsc instead of being
// shown as one of these. Squeezing this into a boolean is the medical bug this card prevents.
function OutcomeView({ eligibility }: { eligibility: DonorEligibility }): React.ReactElement {
  switch (eligibility.outcome) {
    case 'eligible':
      return (
        <View testID="home-eligibility-eligible" style={{ gap: spacing.sm }}>
          <OutcomePill outcome="eligible" label="Boleh mendonor" />
          <AppText>Saat ini kamu memenuhi syarat untuk mendonor. Petugas tetap akan memeriksamu saat datang.</AppText>
        </View>
      );
    case 'not_eligible':
      return (
        <View testID="home-eligibility-not_eligible" style={{ gap: spacing.sm }}>
          <OutcomePill outcome="not_eligible" label="Belum bisa mendonor" />
          <RetryLine eligibility={eligibility} />
          <FindingList eligibility={eligibility} />
        </View>
      );
    case 'undetermined':
      return (
        <View testID="home-eligibility-undetermined" style={{ gap: spacing.sm }}>
          <OutcomePill outcome="undetermined" label="Belum bisa dipastikan" />
          <AppText>Datamu belum cukup untuk memastikan kelayakanmu. Ini bukan berarti kamu tidak bisa mendonor.</AppText>
          <FindingList eligibility={eligibility} />
        </View>
      );
  }
}

/**
 * The date is only a promise when waiting is all that stands in the way. With a deferral or an
 * admin flag, or with data still missing, the donor may stay ineligible after it, so the
 * sentence must not say they may donate.
 */
function RetryLine({ eligibility }: { eligibility: DonorEligibility }): React.ReactElement | null {
  if (eligibility.retry_after_date === null) return null;

  const date = formatDateOnly(eligibility.retry_after_date);
  const waitingIsEnough = eligibility.findings.every(
    (finding) =>
      finding.code !== 'ACTIVE_DEFERRAL' && finding.code !== 'ACTIVE_ADMIN_FLAG' && finding.outcome !== 'undetermined',
  );

  return (
    <AppText tone="strong" testID="home-eligibility-retry">
      {waitingIsEnough ? `Boleh mendonor lagi pada ${date}.` : `Statusmu dapat ditinjau kembali mulai ${date}.`}
    </AppText>
  );
}

function FindingList({ eligibility }: { eligibility: DonorEligibility }): React.ReactElement {
  return (
    <View style={{ gap: spacing.xs }} testID="home-eligibility-findings">
      {eligibility.findings
        .filter((finding) => finding.outcome !== 'eligible')
        .map((finding) => (
          <AppText key={finding.code} tone="muted">
            {findingSentence(finding)}
          </AppText>
        ))}
    </View>
  );
}

// Not StatusChip: that one is typed to inventory batch statuses and their colors.
const OUTCOME_COLOR: Record<EligibilityOutcome, string> = {
  eligible: colors.status.RELEASED,
  not_eligible: colors.status.DISCARDED,
  undetermined: colors.status.TESTING,
};

function OutcomePill({ outcome, label }: { outcome: EligibilityOutcome; label: string }): React.ReactElement {
  const fg = OUTCOME_COLOR[outcome];
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
      <AppText variant="label" style={{ color: fg }}>
        {label}
      </AppText>
    </View>
  );
}
