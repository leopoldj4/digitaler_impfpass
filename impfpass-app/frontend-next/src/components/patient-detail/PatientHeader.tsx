"use client";

import { ShieldCheck, Calendar, Syringe, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials, formatDate } from "@/lib/utils";
import type { PatientDetail } from "@/types/patient";

interface PatientHeaderProps {
  patient: PatientDetail;
  onSign: () => void;
  onUpload: () => void;
}

export function PatientHeader({ patient, onSign, onUpload }: PatientHeaderProps) {
  const pendingCount = patient.vaccinations.filter((v) => !v.is_verified).length;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 text-lg font-semibold">
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            {getInitials(patient.first_name, patient.last_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {patient.first_name} {patient.last_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(patient.birth_date)}
            </span>
            <span className="flex items-center gap-1">
              <Syringe className="h-3.5 w-3.5" />
              {patient.vaccination_count} Impfungen
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {pendingCount > 0 ? (
              <Badge variant="secondary" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <AlertTriangle className="h-3 w-3" />
                {pendingCount} ausstehend
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                <ShieldCheck className="h-3 w-3" />
                Vollständig signiert
              </Badge>
            )}
            {patient.needs_review_count > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {patient.needs_review_count} Review nötig
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={onUpload}>
          Dokument hochladen
        </Button>
        <Button size="sm" onClick={onSign} disabled={pendingCount === 0} className="gap-1.5">
          <ShieldCheck className="h-4 w-4" />
          Digital signieren
        </Button>
      </div>
    </div>
  );
}
