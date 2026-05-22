"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useVaccinationSign } from "@/hooks/useVaccinationMutations";
import type { Vaccination } from "@/types/vaccination";

type Step = "ready" | "signing" | "done" | "error";

interface SignatureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaccinations: Vaccination[];
  patientId: number;
}

const variants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function SignatureSheet({ open, onOpenChange, vaccinations, patientId }: SignatureSheetProps) {
  const [step, setStep] = useState<Step>("ready");
  const [errorMsg, setErrorMsg] = useState("");
  const { mutateAsync } = useVaccinationSign(patientId);

  const unverified = vaccinations.filter((v) => !v.is_verified);

  useEffect(() => {
    if (open) {
      setStep("ready");
      setErrorMsg("");
    }
  }, [open]);

  async function handleSign() {
    if (unverified.length === 0) {
      setErrorMsg("Es gibt keine offenen Einträge zum Signieren.");
      return;
    }
    setStep("signing");
    setErrorMsg("");
    try {
      const response = await mutateAsync(unverified.map((v) => v.id));
      setStep("done");
      toast.success(`${response.signed_count} Impfungen erfolgreich digital signiert`);
      setTimeout(() => onOpenChange(false), 1800);
    } catch (error) {
      setStep("error");
      setErrorMsg(error instanceof Error ? error.message : "Signierung fehlgeschlagen.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (step !== "signing") onOpenChange(o); }}>
      <SheetContent className="w-96 sm:max-w-96 flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">Digitale Signatur</SheetTitle>
              <SheetDescription className="text-xs">
                {unverified.length} Einträge werden signiert
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <div className="flex flex-col gap-4 p-6">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Zu signierende Einträge</p>
            <ul className="space-y-1">
              {unverified.slice(0, 4).map((v) => (
                <li key={v.id} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {v.vaccine_name}
                </li>
              ))}
              {unverified.length > 4 && (
                <li className="text-xs text-muted-foreground pl-3.5">
                  +{unverified.length - 4} weitere…
                </li>
              )}
            </ul>
          </div>

          <div className="flex-1">
            <AnimatePresence mode="wait">
              {step === "ready" && (
                <motion.div key="ready" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="space-y-4">
                  {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                      Abbrechen
                    </Button>
                    <Button className="flex-1 gap-1.5" disabled={unverified.length === 0} onClick={handleSign}>
                      <ShieldCheck className="h-4 w-4" />
                      Signieren
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "signing" && (
                <motion.div key="signing" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="flex flex-col items-center gap-4 py-8">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Wird signiert…</p>
                    <p className="text-sm text-muted-foreground mt-1">Bitte warten</p>
                  </div>
                </motion.div>
              )}

              {step === "done" && (
                <motion.div key="done" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="flex flex-col items-center gap-4 py-8">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center"
                  >
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </motion.div>
                  <div className="text-center">
                    <p className="font-semibold text-emerald-700">Erfolgreich signiert!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {unverified.length} Einträge wurden verifiziert
                    </p>
                  </div>
                </motion.div>
              )}

              {step === "error" && (
                <motion.div key="error" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="flex flex-col items-center gap-4 py-8">
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-destructive">Fehler aufgetreten</p>
                    <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
                  </div>
                  <Button variant="outline" onClick={() => setStep("ready")}>Erneut versuchen</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
