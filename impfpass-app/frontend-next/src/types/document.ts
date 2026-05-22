import type { Id } from "../../convex/_generated/dataModel";

export interface VaccinationDocument {
  id: Id<"vaccination_documents">;
  patient_id: Id<"patients">;
  file_name: string;
  file_path: string;
  file_type: string;
  page_number: number | null;
  uploaded_at: string;
  url: string;
}

export interface UploadResponse {
  documents: VaccinationDocument[];
  extracted_count: number;
}
