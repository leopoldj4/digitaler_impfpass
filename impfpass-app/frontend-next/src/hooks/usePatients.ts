import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { PatientListItem } from "@/types/patient";

export function usePatients(search?: string, initialData?: PatientListItem[]) {
  return useQuery({
    queryKey: queryKeys.patients.list(search),
    queryFn: () => api.patients.list(search),
    initialData: search ? undefined : initialData,
    placeholderData: (prev) => prev,
  });
}
