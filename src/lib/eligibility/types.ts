export type EligibilityOutcome = 'eligible' | 'not_eligible' | 'undetermined';

export type EligibilityFindingCode =
  | 'AGE_BELOW_MINIMUM'
  | 'AGE_ABOVE_MAXIMUM'
  | 'DONATION_INTERVAL_NOT_MET'
  | 'BODY_WEIGHT_BELOW_MINIMUM'
  | 'ACTIVE_DEFERRAL'
  | 'DATA_MISSING'
  | 'ACTIVE_ADMIN_FLAG';

export type EligibilityFinding = {
  code: EligibilityFindingCode;
  outcome: EligibilityOutcome;
  retry_after_date: string | null;
  detail: string | null;
};

export type DonorEligibility = {
  outcome: EligibilityOutcome;
  is_provisional: false;
  retry_after_date: string | null;
  findings: EligibilityFinding[];
};

export const ELIGIBILITY_PATH = '/me/donor/eligibility';
