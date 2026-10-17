// Must match `Appointment.status` in bloodlink docs/api/openapi.yaml (AppointmentStatus on
// the backend). If the two ever differ, the backend is right and this list follows it.
export type AppointmentStatus =
  | 'booked' | 'arrived' | 'screened' | 'completed' | 'cancelled' | 'no_show';

// Exactly the predicate of the partial index `appointments_one_open_per_donor`
// (WHERE status IN ('booked', 'arrived', 'screened')): that index decides between 201 and
// 409, so a narrower client list would show "Pesan" to a donor who is bound to get 409.
export const OPEN_STATUSES: readonly AppointmentStatus[] = ['booked', 'arrived', 'screened'] as const;

// Open is not the same as actionable. arrived/screened mean the donor is at the facility:
// the transition graph allows cancelling them, but that is staff's call on site, not the phone's.
export const DONOR_ACTIONABLE_STATUSES: readonly AppointmentStatus[] = ['booked'] as const;

/** Mirrors the `Appointment` schema in openapi.yaml field for field -- add nothing it lacks. */
export type Appointment = {
  id: string;                    // public_id (uuid)
  donor_id: string;              // donor public_id (uuid)
  scheduled_for: string | null;  // ISO-8601 with zone; null means walk-in
  status: AppointmentStatus;
  arrived_at: string | null;
  screened_at: string | null;
  completed_at: string | null;
  no_show_at: string | null;
  cancelled_at: string | null;
  note: string | null;
};
