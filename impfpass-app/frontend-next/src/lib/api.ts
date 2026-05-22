export { api } from "./api-client";

import { api } from "./api-client";
import type { PatientListItem, PatientDetail } from "@/types/patient";
import type { Vaccination, VaccinationUpdate } from "@/types/vaccination";
import type { UploadResponse } from "@/types/document";

export const fetchPatients = (search?: string): Promise<PatientListItem[]> =>
  api.patients.list(search);

export const fetchPatient = (id: number): Promise<PatientDetail> =>
  api.patients.get(id);

export const updateVaccination = (
  id: number,
  data: VaccinationUpdate,
  performedBy: string,
): Promise<Vaccination> => api.vaccinations.update(id, data, performedBy);

export const verifyVaccination = (id: number, performedBy: string): Promise<unknown> =>
  api.vaccinations.verify(id, performedBy);

export const uploadDocuments = (
  patientId: number,
  files: File[],
): Promise<UploadResponse> =>
  api.documents.upload(patientId, files) as Promise<UploadResponse>;
