import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PatientDetail } from "@/types/patient";
import type { VaccinationCreate, VaccinationUpdate } from "@/types/vaccination";
import type { Id } from "../../convex/_generated/dataModel";

export function useVaccinationCreate(patientId: Id<"patients">) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VaccinationCreate) => api.vaccinations.create(patientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
      toast.success("Impfung hinzugefügt");
    },
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}

export function useVaccinationUpdate(patientId: Id<"patients">) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: Id<"vaccinations">; data: VaccinationUpdate }) =>
      api.vaccinations.update(id, data, "Dr. Erika Meier"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
      toast.success("Eintrag gespeichert");
    },
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}

export function useVaccinationVerify(patientId: Id<"patients">) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vaccinationId: Id<"vaccinations">) =>
      api.vaccinations.verify(vaccinationId, "Dr. Erika Meier"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
    },
    onError: (e: Error) => toast.error(`Signierung fehlgeschlagen: ${e.message}`),
  });
}

export function useVaccinationSign(patientId: Id<"patients">) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vaccinationIds: Id<"vaccinations">[]) =>
      api.vaccinations.sign(vaccinationIds),
    onSuccess: (response, vaccinationIds) => {
      qc.setQueryData<PatientDetail>(queryKeys.patients.detail(patientId), (patient) => {
        if (!patient) return patient;

        return {
          ...patient,
          needs_review_count: patient.vaccinations.filter(
            (vaccination) => !vaccinationIds.includes(vaccination.id) && vaccination.needs_review
          ).length,
          vaccinations: patient.vaccinations.map((vaccination) =>
            vaccinationIds.includes(vaccination.id)
              ? {
                  ...vaccination,
                  is_verified: true,
                  verified_at: response.signed_at,
                  verified_by: response.signed_by,
                  digital_signature_hash: response.signature_hash,
                  digital_signature_payload: { mock: true },
                  digital_signed_at: response.signed_at,
                  digital_signed_by: response.signed_by,
                  needs_review: false,
                }
              : vaccination
          ),
        };
      });
    },
    onError: (e: Error) => toast.error(`Signierung fehlgeschlagen: ${e.message}`),
  });
}
