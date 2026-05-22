import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function usePatientCreate() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: { first_name: string; last_name: string; birth_date: string }) =>
      api.patients.create(data),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.list() });
      toast.success("Patient hinzugefügt");
      router.push(`/patients/${id}`);
    },
    onError: (e: Error) => toast.error(`Fehler: ${e.message}`),
  });
}
