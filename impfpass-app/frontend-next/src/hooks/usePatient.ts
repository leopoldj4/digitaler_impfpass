import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PatientDetail } from "@/types/patient";

export function usePatient(id: number, initialData?: PatientDetail) {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => api.patients.get(id),
    initialData,
    enabled: !!id,
  });
}
