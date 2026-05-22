export interface VaccinationDocument {
  id: number;
  patient_id: number;
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
