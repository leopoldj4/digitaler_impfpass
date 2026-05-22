import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { VaccinationUpdate } from "@/types/vaccination";

export function useVaccinationUpdate(patientId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VaccinationUpdate }) =>
      api.vaccinations.update(id, data, "Dr. Erika Meier"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
      toast.success("Eintrag gespeichert");
    },
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}

export function useVaccinationVerify(patientId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vaccinationId: number) =>
      api.vaccinations.verify(vaccinationId, "Dr. Erika Meier"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
    },
    onError: (e: Error) => toast.error(`Signierung fehlgeschlagen: ${e.message}`),
  });
}

export function useVaccinationSign(patientId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vaccinationIds, password }: { vaccinationIds: number[]; password: string }) =>
      api.vaccinations.sign(vaccinationIds, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
      qc.invalidateQueries({ queryKey: queryKeys.patients.list() });
    },
    onError: (e: Error) => toast.error(`Signierung fehlgeschlagen: ${e.message}`),
  });
}
