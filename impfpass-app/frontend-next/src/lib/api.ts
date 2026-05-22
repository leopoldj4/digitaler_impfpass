export { api } from "./api-client";

import { api } from "./api-client";
import type { Id } from "../../convex/_generated/dataModel";
import type { PatientListItem, PatientDetail } from "@/types/patient";
import type { SignVaccinationsResponse, Vaccination, VaccinationUpdate } from "@/types/vaccination";
import type { UploadResponse } from "@/types/document";

export const fetchPatients = (search?: string): Promise<PatientListItem[]> =>
  api.patients.list(search);

export const fetchPatient = (id: Id<"patients">): Promise<PatientDetail> =>
  api.patients.get(id);

export const updateVaccination = (
  id: Id<"vaccinations">,
  data: VaccinationUpdate,
  performedBy: string,
): Promise<Vaccination> => api.vaccinations.update(id, data, performedBy);

export const verifyVaccination = (id: Id<"vaccinations">, performedBy: string): Promise<unknown> =>
  api.vaccinations.verify(id, performedBy);

export const signVaccinations = (
  vaccinationIds: Id<"vaccinations">[],
): Promise<SignVaccinationsResponse> =>
  api.vaccinations.sign(vaccinationIds);

export const uploadDocuments = (
  patientId: Id<"patients">,
  files: File[],
): Promise<UploadResponse> =>
  api.documents.upload(patientId, files) as Promise<UploadResponse>;
