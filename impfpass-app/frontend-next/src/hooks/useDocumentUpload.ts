import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useDocumentUpload(patientId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => api.documents.upload(patientId, files),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
      toast.success("Dokumente hochgeladen und verarbeitet");
    },
    onError: (e: Error) => toast.error(`Upload fehlgeschlagen: ${e.message}`),
  });
}
