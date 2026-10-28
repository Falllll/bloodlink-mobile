// Mirrors DonorCampaignController::invitation() in the backend: exactly these ten fields.
// The payload carries NO blood group, Rh factor, requested amount or facility coordinates --
// do not look for them, and never render a value for them on the invitation screens.

export type CampaignResponse = 'accepted' | 'declined';

export type BloodComponent =
  | 'whole_blood'
  | 'packed_red_cells'
  | 'fresh_frozen_plasma'
  | 'platelet_concentrate'
  | 'cryoprecipitate';

export type RequestUrgency = 'routine' | 'urgent' | 'emergency';

export type Invitation = {
  id: string;                      // DonorCampaignContact public_id -- the {contact} path param
  facility_name: string;           // name only: no id, no coordinates, no phone
  component: BloodComponent;
  urgency: RequestUrgency;
  needed_by: string;               // ISO-8601
  distance_meters: number;         // snapshot taken when the donor was contacted
  contacted_at: string;            // ISO-8601
  responded_at: string | null;     // ISO-8601
  response: CampaignResponse | null;
  is_open: boolean;                // campaign still active AND not yet answered
};
