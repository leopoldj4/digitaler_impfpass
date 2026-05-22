"use client";

import { DocumentUploadZone, DocumentCard } from "./DocumentUploadZone";
import type { VaccinationDocument } from "@/types/document";
import type { Id } from "../../../convex/_generated/dataModel";

interface DokumenteTabProps {
  documents: VaccinationDocument[];
  patientId: Id<"patients">;
}

export function DokumenteTab({ documents, patientId }: DokumenteTabProps) {
  return (
    <div className="space-y-6">
      <DocumentUploadZone patientId={patientId} />
      {documents.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Hochgeladene Dokumente ({documents.length})
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} url={doc.url} name={doc.file_name} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
