import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Id } from "../../convex/_generated/dataModel";

export function useDocumentUpload(patientId: Id<"patients">) {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (files: File[]) => api.documents.upload(patientId, files),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: queryKeys.patients.detail(patientId) });
      if (result.extracted_count > 0) {
        toast.success(`${result.extracted_count} Impfung${result.extracted_count !== 1 ? "en" : ""} erkannt – bitte prüfen`);
        router.push(`/review/${patientId}`);
      } else {
        toast.success("Dokument hochgeladen");
      }
    },
    onError: (e: Error) => toast.error(`Upload fehlgeschlagen: ${e.message}`),
  });
}
