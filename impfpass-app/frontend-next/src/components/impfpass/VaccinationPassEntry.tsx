import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Vaccination } from "@/types/vaccination";

interface VaccinationPassEntryProps {
  vaccination: Vaccination;
}

export function VaccinationPassEntry({ vaccination: v }: VaccinationPassEntryProps) {
  const isExpired = v.valid_until && new Date(v.valid_until) < new Date();
  const isSoonDue =
    v.valid_until &&
    !isExpired &&
    new Date(v.valid_until) < new Date(Date.now() + 90 * 24 * 3600_000);

  const statusDot = isExpired
    ? "bg-red-500"
    : isSoonDue
    ? "bg-amber-400"
    : v.is_verified
    ? "bg-emerald-500"
    : "bg-slate-300";

  return (
    <div className="flex items-start gap-4 py-3">
      <div className="flex flex-col items-center gap-1 pt-1">
        <div className={`h-2.5 w-2.5 rounded-full ${statusDot}`} />
        <div className="w-px flex-1 bg-border min-h-[24px]" />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground">{v.vaccine_name}</p>
            {v.manufacturer && (
              <p className="text-xs text-muted-foreground">{v.manufacturer}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {v.is_verified ? (
              <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                <ShieldCheck className="h-3 w-3" />
                Signiert
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="h-3 w-3" />
                Ausstehend
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline" className="gap-1 text-[10px] bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="h-3 w-3" />
                Abgelaufen
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-1 flex gap-4 text-xs text-muted-foreground flex-wrap">
          <span>Datum: {formatDate(v.vaccination_date)}</span>
          {v.valid_until && <span>Gültig bis: {formatDate(v.valid_until)}</span>}
          {v.batch_number && <span>Charge: {v.batch_number}</span>}
        </div>
        {v.is_verified && v.verified_by && (
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            Signiert von {v.verified_by}
          </p>
        )}
      </div>
    </div>
  );
}
