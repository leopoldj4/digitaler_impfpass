import type { Id } from "../../convex/_generated/dataModel";

export interface Vaccination {
  id: Id<"vaccinations">;
  patient_id: Id<"patients">;
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
  digital_signature_hash: string | null;
  digital_signature_payload: Record<string, unknown> | null;
  digital_signed_at: string | null;
  digital_signed_by: string | null;
  confidence_score: number | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignVaccinationsResponse {
  signed_count: number;
  signature_hash: string;
  signed_at: string;
  signed_by: string;
  vaccination_ids: Id<"vaccinations">[];
  message: string;
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
