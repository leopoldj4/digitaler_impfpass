import type { Id } from "../../convex/_generated/dataModel";
import type { VaccinationDocument } from "./document";
import type { Vaccination } from "./vaccination";

export interface PatientListItem {
  id: Id<"patients">;
  first_name: string;
  last_name: string;
  birth_date: string;
  vaccination_count: number;
  needs_review_count: number;
}

export interface PatientDetail extends PatientListItem {
  created_at: string;
  vaccinations: Vaccination[];
  documents: VaccinationDocument[];
}
