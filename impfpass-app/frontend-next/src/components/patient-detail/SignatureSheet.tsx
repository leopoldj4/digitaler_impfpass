"use client";

import { useState, useRef, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useVaccinationVerify } from "@/hooks/useVaccinationMutations";
import type { Vaccination } from "@/types/vaccination";

const DEMO_PIN = "1234";

type Step = "pin" | "signing" | "done" | "error";

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
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<Step>("pin");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync } = useVaccinationVerify(patientId);

  const unverified = vaccinations.filter((v) => !v.is_verified);

  useEffect(() => {
    if (open) {
      setPin("");
      setStep("pin");
      setErrorMsg("");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  async function handleSign() {
    if (pin !== DEMO_PIN) {
      setErrorMsg("Falscher PIN. Demo-PIN: 1234");
      setPin("");
      inputRef.current?.focus();
      return;
    }
    setStep("signing");
    setErrorMsg("");
    try {
      await Promise.all(unverified.map((v) => mutateAsync(v.id)));
      setStep("done");
      toast.success(`${unverified.length} Impfungen erfolgreich digital signiert`);
      setTimeout(() => onOpenChange(false), 1800);
    } catch {
      setStep("error");
      setErrorMsg("Signierung fehlgeschlagen. Bitte Backend prüfen.");
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
              {step === "pin" && (
                <motion.div key="pin" variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin">Arzt-PIN eingeben</Label>
                    <Input
                      id="pin"
                      ref={inputRef}
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => { setPin(e.target.value); setErrorMsg(""); }}
                      onKeyDown={(e) => e.key === "Enter" && pin.length >= 4 && handleSign()}
                      className="text-center text-xl tracking-[0.5em]"
                    />
                    {errorMsg ? (
                      <p className="text-xs text-destructive">{errorMsg}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Demo-PIN: <span className="font-mono font-medium">1234</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                      Abbrechen
                    </Button>
                    <Button className="flex-1 gap-1.5" disabled={pin.length < 4} onClick={handleSign}>
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
                  <Button variant="outline" onClick={() => setStep("pin")}>Erneut versuchen</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
