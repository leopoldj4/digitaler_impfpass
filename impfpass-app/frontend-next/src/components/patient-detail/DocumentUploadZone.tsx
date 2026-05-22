"use client";

import { useRef, useState } from "react";
import { Upload, FileImage, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";

export function DocumentUploadZone({ patientId }: { patientId: number }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useDocumentUpload(patientId);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    mutate(Array.from(files));
  }

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
    >
      {isPending ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Wird verarbeitet…</p>
        </>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Impfpass-Scan hochladen</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dateien hierher ziehen oder klicken · JPG, PNG, PDF
            </p>
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

export function DocumentCard({ url, name }: { url: string; name: string }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-muted/30 p-2 transition-all hover:border-primary/40 hover:shadow-sm">
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-slate-100">
        <FileImage className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="mt-2 truncate px-1 text-xs text-muted-foreground">{name}</p>
    </div>
  );
}
