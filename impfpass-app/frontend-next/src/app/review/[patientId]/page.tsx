"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { DocumentViewer } from "@/components/review/document-viewer";
import { VaccinationEntry } from "@/components/review/vaccination-entry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchPatient, updateVaccination } from "@/lib/api";
import type { VaccinationUpdate } from "@/types/vaccination";
import type { Id } from "../../../../convex/_generated/dataModel";

const DOCTOR = "Dr. Mueller";

export default function ReviewPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId: patientIdParam } = use(params);
  const patientId = patientIdParam as Id<"patients">;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => fetchPatient(patientId),
  });

  const handleSave = async (id: Id<"vaccinations">, data: VaccinationUpdate) => {
    await updateVaccination(id, data, DOCTOR);
    await queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
    toast.success("Impfung gespeichert");
  };

  const handleConfirmAll = async () => {
    if (!patient) return;
    setConfirming(true);
    try {
      const pending = patient.vaccinations.filter((v) => !v.is_verified && !v.needs_review);
      await Promise.all(pending.map((v) => updateVaccination(v.id, { needs_review: false }, DOCTOR)));
      await queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      toast.success(`${pending.length} Impfung${pending.length !== 1 ? "en" : ""} bestätigt`);
      setConfirmOpen(false);
      router.push(`/signature/${patientId}`);
    } catch {
      toast.error("Fehler beim Speichern");
    } finally {
      setConfirming(false);
    }
  };

  const pendingReview = patient?.vaccinations.filter((v) => v.needs_review) ?? [];
  const verified = patient?.vaccinations.filter((v) => v.is_verified) ?? [];
  const allGood = pendingReview.length === 0;

  return (
    <div className="flex h-[calc(100svh-3rem)] flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href={`/patients/${patientId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <p className="text-sm font-semibold">{isLoading ? <Skeleton className="h-4 w-32" /> : `${patient?.last_name}, ${patient?.first_name}`}</p>
            <p className="text-xs text-muted-foreground">KI Review — Daten prüfen</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && (allGood ? (
            <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 text-xs dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />Bereit
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertCircle className="h-3 w-3" />{pendingReview.length} prüfen
            </Badge>
          ))}
          <Button size="sm" className="gap-2" disabled={!allGood || isLoading} onClick={() => setConfirmOpen(true)}>
            <Save className="h-4 w-4" />Bestätigen & Signieren
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="hidden w-1/2 border-r lg:flex lg:flex-col">
          {isLoading ? <div className="flex h-full items-center justify-center"><Skeleton className="h-96 w-3/4 rounded-xl" /></div>
            : <DocumentViewer documents={patient?.documents ?? []} />}
        </div>
        <div className="flex min-w-0 w-full flex-col lg:w-1/2">
          <ScrollArea className="min-w-0 flex-1">
            <div className="min-w-0 space-y-4 p-5">
              {patient && (
                <div className="rounded-xl border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</p>
                  <p className="mt-1 text-sm font-semibold">{patient.last_name}, {patient.first_name}</p>
                  <p className="text-xs text-muted-foreground">geb. {new Date(patient.birth_date).toLocaleDateString("de")}</p>
                </div>
              )}
              {!isLoading && patient && (
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{patient.vaccinations.length} erkannt</span>
                  <span>·</span><span className="text-emerald-600">{verified.length} signiert</span>
                  {pendingReview.length > 0 && <><span>·</span><span className="text-destructive">{pendingReview.length} prüfen</span></>}
                </div>
              )}
              {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
                : patient?.vaccinations.map((v, i) => (
                  <motion.div key={v.id} className="min-w-0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                    <VaccinationEntry vaccination={v} index={i} onSave={handleSave} />
                  </motion.div>
                ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daten bestätigen</DialogTitle>
            <DialogDescription>
              Sie bestätigen {patient?.vaccinations.length ?? 0} Impfeinträge für <strong>{patient?.first_name} {patient?.last_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Abbrechen</Button>
            <Button onClick={handleConfirmAll} disabled={confirming}>{confirming ? "Speichern …" : "Bestätigen & zur Signatur"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
