import { formatDate } from "@/lib/utils";
import type { PatientDetail } from "@/types/patient";

interface StammdatenTabProps {
  patient: PatientDetail;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function StammdatenTab({ patient }: StammdatenTabProps) {
  const age = Math.floor(
    (Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 3600_000)
  );

  return (
    <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
      <Field label="Vorname" value={patient.first_name} />
      <Field label="Nachname" value={patient.last_name} />
      <Field label="Geburtsdatum" value={`${formatDate(patient.birth_date)} (${age} Jahre)`} />
      <Field label="Patientenakte angelegt" value={formatDate(patient.created_at)} />
      <Field label="Anzahl Impfungen" value={String(patient.vaccination_count)} />
      <Field label="Ausstehende Reviews" value={String(patient.needs_review_count)} />
    </dl>
  );
}
