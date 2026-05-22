import { useRef, useState } from "react";
import { Upload, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VaccinationDocument } from "@/types/document";

interface Props {
  patientId: number;
  onUploaded: (docs: VaccinationDocument[]) => void;
}

export default function DocumentUpload({ patientId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("patient_id", String(patientId));
    Array.from(files).forEach((f) => form.append("files", f));

    try {
      const res = await fetch("/api/v1/documents/upload", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail ?? `Fehler ${res.status}`);
      }
      const docs: VaccinationDocument[] = await res.json();
      onUploaded(docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Verstecktes File-Input – accept="image/*" zeigt auf Mobile Kamera-Option */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Camera className="mr-2 h-4 w-4" />
        )}
        {uploading ? "Lädt hoch…" : "Fotos hochladen"}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
