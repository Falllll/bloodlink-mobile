export type Sex = 'male' | 'female';
export type BloodGroup = 'A' | 'B' | 'AB' | 'O';
export type RhFactor = 'positive' | 'negative';

export type DonorProfile = {
  id: string;
  donor_number: string;
  full_name: string;
  date_of_birth: string;        // Y-m-d
  sex: Sex;
  blood_group: BloodGroup | null;
  rh_factor: RhFactor | null;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  weight_kg: number | null;
  last_donation_date: string | null;   // Y-m-d
  donation_count: number;
  has_nik: boolean;
};

export type Donation = {
  id: string;
  donor_id: string;
  appointment_id: string;
  screening_id: string | null;
  volume_ml: number;
  started_at: string;          // ISO-8601
  completed_at: string;        // ISO-8601
  note: string | null;
};
