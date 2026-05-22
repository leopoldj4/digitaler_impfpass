import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { Vaccination } from "@/types/vaccination";

interface StatusBannerProps {
  vaccinations: Vaccination[];
}

export function StatusBanner({ vaccinations }: StatusBannerProps) {
  const unverified = vaccinations.filter((v) => !v.is_verified).length;
  const expired = vaccinations.filter(
    (v) => v.valid_until && new Date(v.valid_until) < new Date()
  ).length;

  if (unverified > 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {unverified} Eintrag{unverified !== 1 ? "e" : ""} noch nicht signiert
          </p>
          <p className="text-xs text-amber-700">
            Bitte in der Patientenakte signieren, um den Impfpass zu vervollständigen.
          </p>
        </div>
      </div>
    );
  }

  if (expired > 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
        <XCircle className="h-5 w-5 shrink-0 text-red-600" />
        <div>
          <p className="text-sm font-semibold text-red-800">
            {expired} Impfung{expired !== 1 ? "en" : ""} abgelaufen
          </p>
          <p className="text-xs text-red-700">Auffrischungsimpfung empfohlen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      <div>
        <p className="text-sm font-semibold text-emerald-800">Vollständig signiert</p>
        <p className="text-xs text-emerald-700">Alle Impfeinträge wurden digital verifiziert.</p>
      </div>
    </div>
  );
}
