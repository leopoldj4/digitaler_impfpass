import type { PatientListItem, PatientDetail } from "@/types/patient";
import type { Vaccination, VaccinationUpdate } from "@/types/vaccination";
import type { VaccinationDocument } from "@/types/document";
import {
  MOCK_PATIENTS,
  MOCK_PATIENT_DETAIL,
} from "./mock-data";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const SERVER_BASE =
  typeof window === "undefined"
    ? `${process.env.API_BASE_URL ?? "http://localhost:8000"}/api/v1`
    : "/api/v1";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as Record<string, string>)?.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  patients: {
    list: async (search?: string): Promise<PatientListItem[]> => {
      if (USE_MOCK) {
        if (!search) return MOCK_PATIENTS;
        const q = search.toLowerCase();
        return MOCK_PATIENTS.filter(
          (p) =>
            p.last_name.toLowerCase().includes(q) ||
            p.first_name.toLowerCase().includes(q)
        );
      }
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      return apiFetch<PatientListItem[]>(`/patients${qs}`);
    },

    get: async (id: number): Promise<PatientDetail> => {
      if (USE_MOCK) {
        const base = MOCK_PATIENTS.find((p) => p.id === id);
        if (!base) throw new Error("Patient not found");
        return { ...MOCK_PATIENT_DETAIL, ...base, id };
      }
      return apiFetch<PatientDetail>(`/patients/${id}`);
    },
  },

  vaccinations: {
    update: (
      id: number,
      data: VaccinationUpdate,
      performedBy: string
    ): Promise<Vaccination> =>
      apiFetch<Vaccination>(
        `/vaccinations/${id}?performed_by=${encodeURIComponent(performedBy)}`,
        { method: "PUT", body: JSON.stringify(data) }
      ),

    verify: (id: number, performedBy: string): Promise<unknown> =>
      apiFetch(
        `/vaccinations/${id}/verify?performed_by=${encodeURIComponent(performedBy)}`,
        { method: "PATCH" }
      ),
  },

  documents: {
    upload: async (patientId: number, files: File[]): Promise<unknown> => {
      const form = new FormData();
      form.append("patient_id", String(patientId));
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/v1/documents/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
      return res.json();
    },

    list: (patientId: number): Promise<VaccinationDocument[]> =>
      apiFetch<VaccinationDocument[]>(`/documents/${patientId}`),
  },
};
