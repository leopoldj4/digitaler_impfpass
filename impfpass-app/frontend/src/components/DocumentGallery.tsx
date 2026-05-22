import { useState } from "react";
import { X, FileText, ZoomIn } from "lucide-react";
import type { VaccinationDocument } from "@/types/document";

interface Props {
  documents: VaccinationDocument[];
}

function isPdf(doc: VaccinationDocument) {
  return doc.file_type === "pdf";
}

export default function DocumentGallery({ documents }: Props) {
  const [lightbox, setLightbox] = useState<VaccinationDocument | null>(null);

  if (documents.length === 0) return null;

  return (
    <>
      {/* Galerie */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="group relative flex-shrink-0 cursor-pointer"
            onClick={() => !isPdf(doc) && setLightbox(doc)}
          >
            {isPdf(doc) ? (
              /* PDF-Kachel */
              <div className="flex h-36 w-28 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted text-muted-foreground">
                <FileText className="h-8 w-8" />
                <span className="max-w-[90px] truncate px-1 text-center text-xs">
                  {doc.file_name}
                </span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-blue-500 underline"
                >
                  Öffnen
                </a>
              </div>
            ) : (
              /* Bild-Kachel */
              <div className="relative h-36 w-28 overflow-hidden rounded-lg border border-border shadow-sm">
                <img
                  src={doc.url}
                  alt={doc.file_name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                  <ZoomIn className="h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            )}
            {/* Seitenzahl */}
            {doc.page_number && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                S.{doc.page_number}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1 text-white hover:bg-white/30"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.file_name}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 text-sm text-white/70">{lightbox.file_name}</p>
        </div>
      )}
    </>
  );
}
