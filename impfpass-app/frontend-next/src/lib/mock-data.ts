import type { PatientListItem, PatientDetail } from "@/types/patient";
import type { Vaccination } from "@/types/vaccination";
import type { VaccinationDocument } from "@/types/document";

const now = new Date().toISOString();

export const MOCK_PATIENTS: PatientListItem[] = [
  { id: 1, first_name: "Max", last_name: "Mustermann", birth_date: "1985-03-12", vaccination_count: 7, needs_review_count: 1 },
  { id: 2, first_name: "Anna", last_name: "Schmidt", birth_date: "1992-07-24", vaccination_count: 5, needs_review_count: 0 },
  { id: 3, first_name: "Klaus", last_name: "Weber", birth_date: "1978-11-05", vaccination_count: 6, needs_review_count: 2 },
  { id: 4, first_name: "Laura", last_name: "Fischer", birth_date: "2001-02-18", vaccination_count: 4, needs_review_count: 0 },
  { id: 5, first_name: "Thomas", last_name: "Becker", birth_date: "1965-09-30", vaccination_count: 8, needs_review_count: 1 },
  { id: 6, first_name: "Sabine", last_name: "Müller", birth_date: "1990-06-14", vaccination_count: 3, needs_review_count: 0 },
  { id: 7, first_name: "Peter", last_name: "Hoffmann", birth_date: "1958-12-22", vaccination_count: 9, needs_review_count: 3 },
  { id: 8, first_name: "Maria", last_name: "Wagner", birth_date: "1995-04-07", vaccination_count: 5, needs_review_count: 0 },
  { id: 9, first_name: "Stefan", last_name: "Schulz", birth_date: "1972-08-19", vaccination_count: 6, needs_review_count: 1 },
  { id: 10, first_name: "Julia", last_name: "Koch", birth_date: "2003-01-11", vaccination_count: 4, needs_review_count: 0 },
  { id: 11, first_name: "Michael", last_name: "Richter", birth_date: "1980-05-28", vaccination_count: 7, needs_review_count: 2 },
  { id: 12, first_name: "Christine", last_name: "Klein", birth_date: "1969-10-03", vaccination_count: 5, needs_review_count: 0 },
];

const makeVaccination = (
  id: number,
  patientId: number,
  overrides: Partial<Vaccination>
): Vaccination => ({
  id,
  patient_id: patientId,
  vaccine_name: "Tetanus/Diphtherie",
  vaccine_type: "Totimpfstoff",
  manufacturer: "Sanofi Pasteur",
  batch_number: `B${String(id * 1234).padStart(6, "0")}`,
  vaccination_date: "2022-06-15",
  valid_until: "2032-06-15",
  indication: "Grundimmunisierung",
  doctor_stamp: "Dr. Erika Meier",
  is_verified: true,
  verified_at: "2022-06-15T10:30:00Z",
  verified_by: "Dr. Erika Meier",
  digital_signature_hash: null,
  digital_signature_payload: null,
  digital_signed_at: null,
  digital_signed_by: null,
  confidence_score: 0.97,
  needs_review: false,
  created_at: now,
  updated_at: now,
  ...overrides,
});

export const MOCK_PATIENT_DETAIL: PatientDetail = {
  id: 1,
  first_name: "Max",
  last_name: "Mustermann",
  birth_date: "1985-03-12",
  vaccination_count: 7,
  needs_review_count: 1,
  created_at: "2024-01-15T08:00:00Z",
  vaccinations: [
    makeVaccination(1, 1, { vaccine_name: "Tetanus/Diphtherie", vaccination_date: "2022-06-15", valid_until: "2032-06-15" }),
    makeVaccination(2, 1, { vaccine_name: "COVID-19 (BNT162b2)", vaccine_type: "mRNA", manufacturer: "BioNTech/Pfizer", vaccination_date: "2021-05-12", valid_until: "2023-05-12", is_verified: true, verified_by: "Dr. Erika Meier" }),
    makeVaccination(3, 1, { vaccine_name: "Influenza 2023/24", vaccine_type: "Totimpfstoff", manufacturer: "AstraZeneca", vaccination_date: "2023-10-20", valid_until: "2024-04-30", is_verified: false, verified_at: null, verified_by: null, confidence_score: 0.71, needs_review: true }),
    makeVaccination(4, 1, { vaccine_name: "MMR (Masern/Mumps/Röteln)", vaccine_type: "Lebendimpfstoff", manufacturer: "Merck Sharp & Dohme", vaccination_date: "2018-03-08", valid_until: null }),
    makeVaccination(5, 1, { vaccine_name: "Hepatitis B", vaccine_type: "Totimpfstoff", manufacturer: "GlaxoSmithKline", vaccination_date: "2019-09-22", valid_until: null }),
    makeVaccination(6, 1, { vaccine_name: "FSME (Frühsommer-Meningoenzephalitis)", vaccine_type: "Totimpfstoff", manufacturer: "Pfizer/Baxter", vaccination_date: "2021-04-10", valid_until: "2024-04-10" }),
    makeVaccination(7, 1, { vaccine_name: "Pneumokokken", vaccine_type: "Konjugatimpfstoff", manufacturer: "Pfizer", vaccination_date: "2020-11-15", valid_until: null }),
  ],
  documents: [
    { id: 1, patient_id: 1, file_name: "impfpass_scan_01.jpg", file_path: "uploads/1/impfpass_scan_01.jpg", file_type: "image/jpeg", page_number: 1, uploaded_at: "2024-01-15T08:05:00Z", url: "/uploads/1/impfpass_scan_01.jpg" },
    { id: 2, patient_id: 1, file_name: "impfpass_scan_02.jpg", file_path: "uploads/1/impfpass_scan_02.jpg", file_type: "image/jpeg", page_number: 2, uploaded_at: "2024-01-15T08:05:30Z", url: "/uploads/1/impfpass_scan_02.jpg" },
  ],
};

export const MOCK_DASHBOARD_STATS = {
  totalPatients: 247,
  verifiedThisMonth: 89,
  pendingReview: 14,
  documentsProcessed: 1834,
};

export const MOCK_MONTHLY_DATA = [
  { month: "Dez", vaccinations: 34, verified: 28 },
  { month: "Jan", vaccinations: 52, verified: 44 },
  { month: "Feb", vaccinations: 41, verified: 38 },
  { month: "Mär", vaccinations: 67, verified: 59 },
  { month: "Apr", vaccinations: 78, verified: 72 },
  { month: "Mai", vaccinations: 89, verified: 83 },
];

export const MOCK_STATUS_DATA = [
  { name: "Verifiziert", value: 892, color: "#10b981" },
  { name: "Ausstehend", value: 156, color: "#f59e0b" },
  { name: "Review nötig", value: 47, color: "#ef4444" },
];

export const MOCK_ACTIVITY = [
  { id: 1, action: "VERIFY", patient: "Max Mustermann", detail: "7 Impfungen signiert", by: "Dr. Erika Meier", at: new Date(Date.now() - 5 * 60_000).toISOString() },
  { id: 2, action: "UPLOAD", patient: "Anna Schmidt", detail: "2 Dokumente hochgeladen", by: "Sabine Koch", at: new Date(Date.now() - 18 * 60_000).toISOString() },
  { id: 3, action: "IMPORT", patient: "Klaus Weber", detail: "Impfpass importiert (6 Einträge)", by: "System", at: new Date(Date.now() - 45 * 60_000).toISOString() },
  { id: 4, action: "UPDATE", patient: "Laura Fischer", detail: "Charge geändert: B005821", by: "Dr. Thomas Bauer", at: new Date(Date.now() - 2 * 3600_000).toISOString() },
  { id: 5, action: "VERIFY", patient: "Thomas Becker", detail: "8 Impfungen signiert", by: "Dr. Erika Meier", at: new Date(Date.now() - 3 * 3600_000).toISOString() },
  { id: 6, action: "UPLOAD", patient: "Sabine Müller", detail: "1 Dokument hochgeladen", by: "Sabine Koch", at: new Date(Date.now() - 5 * 3600_000).toISOString() },
  { id: 7, action: "IMPORT", patient: "Peter Hoffmann", detail: "Impfpass importiert (9 Einträge)", by: "System", at: new Date(Date.now() - 24 * 3600_000).toISOString() },
  { id: 8, action: "VERIFY", patient: "Maria Wagner", detail: "5 Impfungen signiert", by: "Dr. Thomas Bauer", at: new Date(Date.now() - 26 * 3600_000).toISOString() },
];
