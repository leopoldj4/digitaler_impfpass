"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { VaccinationDocument } from "@/types/document";

interface DocumentViewerProps {
  documents: VaccinationDocument[];
}

export function DocumentViewer({ documents }: DocumentViewerProps) {
  const [docIndex, setDocIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const current = documents[docIndex];
  const isImage = current?.file_type?.startsWith("image/") ?? !current?.file_name.endsWith(".pdf");

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 250));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const rotate = () => setRotation((r) => (r + 90) % 360);

  if (!documents.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Kein Dokument verfügbar</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={rotate}>
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {documents.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDocIndex((i) => i - 1)}
              disabled={docIndex === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Badge variant="secondary" className="text-[10px]">
              {docIndex + 1} / {documents.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDocIndex((i) => i + 1)}
              disabled={docIndex === documents.length - 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <span className="max-w-[120px] truncate text-[10px] text-muted-foreground">
          {current.file_name}
        </span>
      </div>

      {/* Document display */}
      <div className="flex-1 overflow-auto bg-muted/20 p-4">
        <div className="flex min-h-full items-center justify-center">
          <motion.div
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "center",
            }}
            transition={{ duration: 0.2 }}
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt={current.file_name}
                className="max-w-full rounded-lg shadow-lg"
                style={{ maxHeight: "70vh" }}
              />
            ) : (
              <iframe
                src={current.url}
                title={current.file_name}
                className="rounded-lg shadow-lg"
                style={{ width: "100%", minWidth: "400px", height: "70vh" }}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {documents.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t bg-muted/20 p-2">
          {documents.map((doc, i) => (
            <button
              key={doc.id}
              onClick={() => setDocIndex(i)}
              className={`shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                i === docIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {doc.file_type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.url} alt={doc.file_name} className="h-14 w-10 object-cover" />
              ) : (
                <div className="flex h-14 w-10 items-center justify-center bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
