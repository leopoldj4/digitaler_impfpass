"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Shield, Syringe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { fetchPatient, signVaccinations } from "@/lib/api";
import type { PatientDetail } from "@/types/patient";
import type { Id } from "../../../../convex/_generated/dataModel";

type Step = "review" | "consent" | "success";

export default function SignaturePage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId: patientIdParam } = use(params);
  const patientId = patientIdParam as Id<"patients">;
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("review");
  const [consent, setConsent] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signedCount, setSignedCount] = useState(0);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => fetchPatient(patientId),
  });

  const unverified = patient?.vaccinations.filter((v) => !v.is_verified) ?? [];

  const handleSign = async () => {
    setSigning(true);
    const countToSign = unverified.length;
    try {
      const vaccinationIds = unverified.map((v) => v.id);
      const response = await signVaccinations(vaccinationIds);
      queryClient.setQueryData<PatientDetail>(["patient", patientId], (current) => {
        if (!current) return current;

        return {
          ...current,
          needs_review_count: current.vaccinations.filter(
            (vaccination) => !vaccinationIds.includes(vaccination.id) && vaccination.needs_review
          ).length,
          vaccinations: current.vaccinations.map((vaccination) =>
            vaccinationIds.includes(vaccination.id)
              ? {
                  ...vaccination,
                  is_verified: true,
                  verified_at: response.signed_at,
                  verified_by: response.signed_by,
                  digital_signature_hash: response.signature_hash,
                  digital_signature_payload: { mock: true },
                  digital_signed_at: response.signed_at,
                  digital_signed_by: response.signed_by,
                  needs_review: false,
                }
              : vaccination
          ),
        };
      });
      setSignedCount(response.signed_count ?? countToSign);
      setStep("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signatur fehlgeschlagen");
    } finally { setSigning(false); }
  };

  const stepIndex = { review: 0, consent: 1, success: 2 };
  const stepConfig = [{ key: "review", label: "Prüfung" }, { key: "consent", label: "Zustimmung" }] as const;

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`/patients/${patientId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">E-Signatur</h1>
          {!isLoading && patient && <p className="text-sm text-muted-foreground">{patient.last_name}, {patient.first_name}</p>}
        </div>
      </div>

      {step !== "success" && (
        <div className="flex items-center gap-2">
          {stepConfig.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-6 bg-border" />}
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${stepIndex[step] > i ? "bg-primary text-primary-foreground" : stepIndex[step] === i ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground"}`}>
                {stepIndex[step] > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium ${stepIndex[step] >= i ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "review" && (
          <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">{unverified.length} Impfung{unverified.length !== 1 ? "en" : ""} zur Signatur</p></div>
                <Separator />
                <div className="space-y-2">
                  {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
                    : unverified.map((v) => (
                      <div key={v.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{v.vaccine_name}</p>
                          <p className="text-xs text-muted-foreground">{v.vaccination_date ? new Date(v.vaccination_date).toLocaleDateString("de") : "Kein Datum"}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">Ausstehend</Badge>
                      </div>
                    ))}
                </div>
                {unverified.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center gap-2 py-4 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-500" /><p className="text-sm font-medium">Alle Impfungen bereits signiert</p></div>
                )}
                <Button className="w-full gap-2" disabled={unverified.length === 0 || isLoading} onClick={() => setStep("consent")}>
                  <Shield className="h-4 w-4" />Weiter zur Zustimmung
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "consent" && (
          <motion.div key="consent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <CardContent className="space-y-5 p-6">
                <p className="text-sm font-semibold">Rechtliche Zustimmung</p>
                <div className="rounded-xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
                  Ich, Dr. Mueller, bestätige die Richtigkeit der eingetragenen Impfdaten für den o.g. Patienten. Die digitale Signatur entspricht meiner handschriftlichen Unterschrift gemäß eIDAS-Verordnung.
                </div>
                <div className="flex items-start gap-3 rounded-xl border p-4">
                  <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                  <Label htmlFor="consent" className="cursor-pointer text-xs leading-relaxed">Ich stimme der digitalen Signatur der Impfeinträge zu.</Label>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("review")}>Zurück</Button>
                  <Button className="flex-1 gap-2" disabled={!consent || signing} onClick={handleSign}>
                    <Shield className="h-4 w-4" />{signing ? "Signiere ..." : "Jetzt signieren"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10">
              <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 300 }}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </motion.div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-emerald-800 dark:text-emerald-300">Erfolgreich signiert</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">{signedCount} Impfung{signedCount !== 1 ? "en" : ""} signiert.</p>
                </div>
                <div className="flex gap-2 w-full">
                  <Button variant="outline" className="flex-1" asChild><Link href={`/patients/${patientId}`}>Zum Profil</Link></Button>
                  <Button className="flex-1" asChild><Link href="/">Dashboard</Link></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
