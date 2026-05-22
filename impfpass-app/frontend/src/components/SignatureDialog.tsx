import { useState, useRef, useEffect } from "react";
import { ShieldCheck, Loader2, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFetch } from "@/lib/auth";
import type { Vaccination } from "@/types/vaccination";

// Demo-PIN – echter Signatur-Flow wird vom Kollegen implementiert
const DEMO_PIN = "1234";

interface Props {
  open: boolean;
  onClose: () => void;
  vaccinations: Vaccination[];
  onSuccess: () => void;
}

type Step = "pin" | "signing" | "done" | "error";

export default function SignatureDialog({ open, onClose, vaccinations, onSuccess }: Props) {
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<Step>("pin");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // PIN-Input fokussieren wenn Dialog öffnet
  useEffect(() => {
    if (open) {
      setPin("");
      setStep("pin");
      setErrorMsg("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  async function handleSign() {
    if (pin !== DEMO_PIN) {
      setErrorMsg("Falscher PIN. Bitte erneut versuchen.");
      setPin("");
      inputRef.current?.focus();
      return;
    }

    setStep("signing");
    setErrorMsg("");

    // Alle unverifizierte Impfungen signieren
    const unverified = vaccinations.filter((v) => !v.is_verified);
    try {
      await Promise.all(
        unverified.map((v) =>
          authFetch(`/api/v1/vaccinations/${v.id}/verify?performed_by=Dr.+Demo`, {
            method: "PATCH",
          })
        )
      );
      setStep("done");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch {
      setStep("error");
      setErrorMsg("Signierung fehlgeschlagen. Bitte Backend prüfen.");
    }
  }

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && step === "pin" && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Digitale Signatur</h2>
              <p className="text-xs text-muted-foreground">
                {vaccinations.filter((v) => !v.is_verified).length} Einträge werden signiert
              </p>
            </div>
          </div>
          {step === "pin" && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* PIN-Eingabe */}
        {step === "pin" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Arzt-PIN eingeben</label>
              <Input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg("");
                }}
                onKeyDown={(e) => e.key === "Enter" && pin.length >= 4 && handleSign()}
                className="text-center text-xl tracking-[0.5em]"
              />
              {errorMsg && <p className="mt-1.5 text-xs text-destructive">{errorMsg}</p>}
              <p className="mt-1.5 text-xs text-muted-foreground">
                Demo-PIN: <span className="font-mono font-medium">1234</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Abbrechen
              </Button>
              <Button
                className="flex-1"
                disabled={pin.length < 4}
                onClick={handleSign}
              >
                Signieren
              </Button>
            </div>
          </div>
        )}

        {/* Signing-Spinner */}
        {step === "signing" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Signiere Einträge…</p>
          </div>
        )}

        {/* Erfolg */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-medium text-emerald-700">Erfolgreich signiert!</p>
            <p className="text-xs text-muted-foreground">Alle Impfeinträge wurden verifiziert.</p>
          </div>
        )}

        {/* Fehler */}
        {step === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button variant="outline" className="w-full" onClick={() => setStep("pin")}>
              Erneut versuchen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
