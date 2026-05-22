"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthStep = "credentials" | "two-factor";
type Status = "idle" | "submitting" | "verifying" | "success";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("doctor@example.com");
  const [password, setPassword] = useState("ChangeMe!234");
  const [code, setCode] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<AuthStep>("credentials");
  const [status, setStatus] = useState<Status>("idle");

  const canSubmit = useMemo(() => Boolean(email.trim() && password.trim()), [email, password]);
  const canVerify = useMemo(() => code.trim().length >= 6, [code]);

  function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || status === "submitting") return;

    setStatus("submitting");
    window.setTimeout(() => {
      setStep("two-factor");
      setStatus("idle");
    }, 350);
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canVerify || status === "verifying") return;

    setStatus("verifying");
    window.setTimeout(() => {
      setStatus("success");
      window.setTimeout(() => router.replace("/"), 450);
    }, 500);
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[0.92fr_1fr]">
      <section className="relative flex min-h-[38vh] flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white md:min-h-screen md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(20,184,166,0.28),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,118,110,0.78))]" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-white/30 bg-white/10">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div className="relative max-w-lg">
          <p className="mb-3 text-xs font-bold uppercase tracking-normal text-teal-100">
            DigitalImpfpass
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Praxiszugang
          </h1>
          <p className="mt-5 text-sm leading-6 text-slate-100 md:text-base">
            Zugriff auf Patienten, Impfpass-Scans und Signaturabläufe.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-2 text-xs font-medium text-teal-50">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <ShieldCheck className="h-4 w-4" /> 2FA Demo
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Praxis
          </span>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-normal text-muted-foreground">
                {step === "credentials" ? "Anmelden" : "Zweiter Faktor"}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                {step === "credentials" ? "Willkommen zurück" : "Zugriff bestätigen"}
              </h2>
            </div>
            <ShieldCheck className="h-8 w-8 text-teal-700" />
          </div>

          {step === "credentials" ? (
            <form className="space-y-4" onSubmit={submitCredentials}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">E-Mail</span>
                <div className="relative">
                  <UserRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10 pl-9"
                    autoComplete="email"
                    required
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Passwort</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10 pl-9 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                    className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <Button
                type="submit"
                className="h-10 w-full gap-2"
                disabled={!canSubmit || status === "submitting"}
              >
                <KeyRound className="h-4 w-4" />
                {status === "submitting" ? "Prüfe..." : "Weiter"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitCode}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Verifizierungscode</span>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  className="h-11 text-center text-lg font-semibold tracking-[0.3em]"
                  autoComplete="one-time-code"
                  required
                />
              </label>

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                Demo-Code: <span className="font-mono">123456</span>
              </div>

              <Button
                type="submit"
                className="h-10 w-full gap-2"
                disabled={!canVerify || status === "verifying"}
              >
                {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                {status === "verifying" ? "Prüfe..." : status === "success" ? "Angemeldet" : "Prüfen und öffnen"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                disabled={status === "verifying"}
                onClick={() => {
                  setStep("credentials");
                  setStatus("idle");
                }}
              >
                Zurück
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
