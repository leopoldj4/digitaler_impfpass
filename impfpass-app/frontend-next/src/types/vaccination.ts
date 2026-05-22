export interface Vaccination {
  id: number;
  patient_id: number;
  vaccine_name: string;
  vaccine_type: string | null;
  manufacturer: string | null;
  batch_number: string | null;
  vaccination_date: string | null;
  valid_until: string | null;
  indication: string | null;
  doctor_stamp: string | null;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  confidence_score: number | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaccinationUpdate {
  vaccine_name?: string;
  vaccine_type?: string | null;
  manufacturer?: string | null;
  batch_number?: string | null;
  vaccination_date?: string | null;
  valid_until?: string | null;
  indication?: string | null;
  doctor_stamp?: string | null;
  needs_review?: boolean;
}
