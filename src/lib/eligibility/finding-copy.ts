import type { EligibilityFinding, EligibilityFindingCode } from './types';

/** One Indonesian sentence per finding. Donor-facing: no medical jargon, no blame. */
export const FINDING_COPY: Record<EligibilityFindingCode, string> = {
  AGE_BELOW_MINIMUM: 'Usiamu belum mencapai batas minimum untuk donor darah.',
  AGE_ABOVE_MAXIMUM: 'Usiamu melewati batas maksimum untuk donor darah.',
  DONATION_INTERVAL_NOT_MET: 'Tubuhmu masih butuh waktu pulih sejak donasi terakhir.',
  BODY_WEIGHT_BELOW_MINIMUM: 'Berat badanmu belum memenuhi batas minimum untuk donor darah.',
  // Neutral on purpose: these two must never name or hint at the reason behind them.
  ACTIVE_DEFERRAL: 'Ada penundaan donor yang sedang berlaku pada akunmu. Petugas fasilitas donor darah dapat menjelaskannya.',
  DATA_MISSING: 'Sebagian datamu belum lengkap. Petugas fasilitas donor darah dapat melengkapinya.',
  ACTIVE_ADMIN_FLAG: 'Ada catatan yang perlu ditinjau pada akunmu. Petugas fasilitas donor darah dapat menjelaskannya.',
};

/**
 * Only the two sensitive codes may show the server's own wording, because the server decides
 * what is safe to say about them; every other code keeps the single sentence above.
 */
export function findingSentence(finding: EligibilityFinding): string {
  if (finding.code === 'ACTIVE_DEFERRAL' || finding.code === 'ACTIVE_ADMIN_FLAG') {
    return finding.detail ?? FINDING_COPY[finding.code];
  }
  return FINDING_COPY[finding.code];
}
