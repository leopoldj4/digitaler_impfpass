"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, User } from "lucide-react";
import { toast } from "sonner";
import { DropZone } from "@/components/upload/drop-zone";
import { StatusPipeline, type UploadStatus } from "@/components/upload/status-pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPatients, uploadDocuments } from "@/lib/api";
import type { PatientListItem } from "@/types/patient";

type FlowStep = "select-patient" | "upload" | "processing";

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("select-patient");
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients", search],
    queryFn: () => fetchPatients(search || undefined),
  });

  const handleFiles = async (files: File[]) => {
    if (!selectedPatient) return;
    setStep("processing");
    setUploadStatus("uploading");
    setUploadProgress(20);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setUploadStatus("ocr");
      setUploadProgress(40);
      await new Promise((r) => setTimeout(r, 500));
      setUploadStatus("ai");
      setUploadProgress(60);
      const result = await uploadDocuments(selectedPatient.id, files);
      setUploadStatus("extracted");
      setUploadProgress(80);
      await new Promise((r) => setTimeout(r, 400));
      setUploadStatus("review");
      setUploadProgress(100);
      if (result.extracted_count > 0) {
        toast.success(`${result.extracted_count} Impfung${result.extracted_count !== 1 ? "en" : ""} erkannt`);
        await new Promise((r) => setTimeout(r, 800));
        router.push(`/review/${selectedPatient.id}`);
      } else {
        toast.info("Dokument gespeichert — keine Impfdaten erkannt.");
        await new Promise((r) => setTimeout(r, 800));
        router.push(`/patients/${selectedPatient.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      setStep("upload");
      setUploadStatus("idle");
      setUploadProgress(0);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Impfausweis hochladen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fotos oder PDFs hochladen — die KI erkennt die Daten automatisch.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(["select-patient", "upload", "processing"] as FlowStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <span className={step === s ? "font-semibold text-primary" : ""}>
              {s === "select-patient" ? "1. Patient" : s === "upload" ? "2. Hochladen" : "3. Verarbeitung"}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "select-patient" && (
          <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardHeader><CardTitle className="text-base">Patient auswählen</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Patient suchen …" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" autoFocus />
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border divide-y">
                  {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-20" /></div>
                    </div>
                  )) : !patients?.length ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <User className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Keine Patienten gefunden</p>
                    </div>
                  ) : patients.map((p) => (
                    <button key={p.id} onClick={() => { setSelectedPatient(p); setStep("upload"); }}
                      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/60">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.last_name}, {p.first_name}</p>
                        <p className="text-xs text-muted-foreground">{p.vaccination_count} Impfungen</p>
                      </div>
                      {p.needs_review_count > 0 && <Badge variant="destructive" className="text-[10px]">{p.needs_review_count} prüfen</Badge>}
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "upload" && selectedPatient && (
          <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                </div>
                <p className="text-sm font-semibold">{selectedPatient.last_name}, {selectedPatient.first_name}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep("select-patient")}>Ändern</Button>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Dokumente hochladen</CardTitle></CardHeader>
              <CardContent><DropZone onFiles={handleFiles} /></CardContent>
            </Card>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
            <Card>
              <CardContent className="space-y-8 p-8">
                <div className="text-center">
                  <p className="text-lg font-semibold">Dokument wird verarbeitet …</p>
                  <p className="mt-1 text-sm text-muted-foreground">Die KI analysiert den Impfausweis.</p>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
                <StatusPipeline status={uploadStatus} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
