import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/lib/auth";
import { setAccessToken } from "@/lib/auth";

interface LoginResponse {
  challenge_id: string;
  two_factor_required: boolean;
  expires_at: string;
  dev_code?: string | null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

interface Props {
  onAuthenticated: (user: AuthUser) => void;
}

type AuthStep = "password" | "two-factor";
type Status = { type: "idle" | "loading" | "success" | "error"; message: string };

export default function LoginPage({ onAuthenticated }: Props) {
  const [step, setStep] = useState<AuthStep>("password");
  const [challenge, setChallenge] = useState<LoginResponse | null>(null);
  const [form, setForm] = useState({ email: "doctor@example.com", password: "ChangeMe!234", code: "" });
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const [showPassword, setShowPassword] = useState(false);

  const canSubmitPassword = useMemo(() => form.email.trim() && form.password.trim(), [form.email, form.password]);
  const canSubmitCode = useMemo(() => form.code.trim().length >= 6, [form.code]);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitPassword) return;

    setStatus({ type: "loading", message: "Zugangsdaten werden geprüft..." });
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Login fehlgeschlagen");

      setChallenge(data);
      setStep("two-factor");
      setForm((current) => ({ ...current, code: data.dev_code ?? "" }));
      setStatus({ type: "success", message: "Zugangsdaten korrekt. Bitte zweiten Faktor bestätigen." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Login fehlgeschlagen" });
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitCode || !challenge) return;

    setStatus({ type: "loading", message: "Code wird geprüft..." });
    try {
      const response = await fetch("/api/v1/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challenge.challenge_id, code: form.code }),
      });
      const data: TokenResponse = await response.json();
      if (!response.ok) throw new Error((data as unknown as { detail?: string }).detail ?? "2FA-Prüfung fehlgeschlagen");

      setAccessToken(data.access_token);
      onAuthenticated(data.user);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "2FA-Prüfung fehlgeschlagen" });
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[0.92fr_1fr]">
      <section className="relative flex min-h-[38vh] flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white md:min-h-screen md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(20,184,166,0.28),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,118,110,0.78))]" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-lg border border-white/30 bg-white/10">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div className="relative max-w-lg">
          <p className="mb-3 text-xs font-bold uppercase tracking-normal text-teal-100">DigitalImpfpass</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Praxiszugang</h1>
          <p className="mt-5 text-sm leading-6 text-slate-100 md:text-base">
            Geschützter Zugriff auf Patienten, Impfpass-Scans und digitale Signaturen.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-2 text-xs font-medium text-teal-50">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <ShieldCheck className="h-4 w-4" /> 2FA erforderlich
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Zugriff geschützt
          </span>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-normal text-muted-foreground">
                {step === "password" ? "Anmelden" : "Zweiter Faktor"}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                {step === "password" ? "Willkommen zurück" : "Zugriff bestätigen"}
              </h2>
            </div>
            <ShieldCheck className="h-8 w-8 text-teal-700" />
          </div>

          {step === "password" ? (
            <form className="space-y-4" onSubmit={submitPassword}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">E-Mail</span>
                <div className="relative">
                  <UserRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
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
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
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

              <Button className="h-10 w-full gap-2" disabled={!canSubmitPassword || status.type === "loading"}>
                <KeyRound className="h-4 w-4" />
                Weiter
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitCode}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Verifizierungscode</span>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, "") })}
                  className="h-11 text-center text-lg font-semibold tracking-[0.3em]"
                  autoComplete="one-time-code"
                  required
                />
              </label>

              {challenge?.dev_code && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                  Entwicklungs-Code: <span className="font-mono">{challenge.dev_code}</span>
                </div>
              )}

              <Button className="h-10 w-full gap-2" disabled={!canSubmitCode || status.type === "loading"}>
                <CheckCircle2 className="h-4 w-4" />
                Prüfen und öffnen
              </Button>
              <Button type="button" variant="outline" className="h-10 w-full" onClick={() => setStep("password")}>
                Zurück
              </Button>
            </form>
          )}

          {status.message && (
            <p
              className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
                status.type === "error"
                  ? "bg-red-50 text-red-700"
                  : status.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {status.message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

