import { Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { VaccinationPassEntry } from "./VaccinationPassEntry";
import { formatDate } from "@/lib/utils";
import type { PatientDetail } from "@/types/patient";

interface ImpfpassCardProps {
  patient: PatientDetail;
}

export function ImpfpassCard({ patient }: ImpfpassCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header gradient */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">
              Digitaler Impfausweis
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              {patient.first_name} {patient.last_name}
            </h2>
            <p className="mt-0.5 text-sm text-primary-foreground/80">
              Geb. {formatDate(patient.birth_date)}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Shield className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-xs text-primary-foreground/70">
          <div>
            <span className="font-medium text-white">{patient.vaccination_count}</span>
            <span className="ml-1">Impfungen</span>
          </div>
          <div>
            <span className="font-medium text-white">
              {patient.vaccinations.filter((v) => v.is_verified).length}
            </span>
            <span className="ml-1">Signiert</span>
          </div>
        </div>
      </div>

      {/* Vaccinations timeline */}
      <div className="px-6 pt-4 pb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Impfverlauf
        </p>
        <Separator className="mb-3" />
        {patient.vaccinations.map((v, i) => (
          <div key={v.id}>
            <VaccinationPassEntry vaccination={v} />
            {i < patient.vaccinations.length - 1 && <div className="h-px" />}
          </div>
        ))}
      </div>
    </div>
  );
}
