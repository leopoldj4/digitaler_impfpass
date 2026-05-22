import type { Id } from "../../convex/_generated/dataModel";

export interface VaccinationDocument {
  id: Id<"vaccination_documents">;
  patient_id: Id<"patients">;
  file_name: string;
  file_path: string;
  file_type: string;
  page_number: number | null;
  extraction_status: "pending" | "succeeded" | "failed" | "skipped";
  extraction_result: ExtractionResponse | null;
  extraction_error: string | null;
  extracted_at: string | null;
  uploaded_at: string;
  url: string;
}

export interface UploadResponse {
  documents: VaccinationDocument[];
  extracted_count: number;
}

export interface ExtractionResponse {
  birth_date: string | null;
  birth_place: string | null;
  first_name: string | null;
  last_name: string | null;
  vaccinations: {
    date: string | null;
    id: string | null;
  }[]
  ;
}
