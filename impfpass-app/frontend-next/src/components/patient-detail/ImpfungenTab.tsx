"use client";

import { AlertTriangle, Syringe } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VaccinationRow } from "./VaccinationRow";
import { checkPlausibility } from "@/lib/plausibility";
import type { Vaccination } from "@/types/vaccination";
import type { Id } from "../../../convex/_generated/dataModel";

interface ImpfungenTabProps {
  vaccinations: Vaccination[];
  patientId: Id<"patients">;
  birthDate: string;
}

export function ImpfungenTab({ vaccinations, patientId, birthDate }: ImpfungenTabProps) {
  const warnings = checkPlausibility(vaccinations, birthDate);

  if (vaccinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Syringe className="h-10 w-10 opacity-30" />
        <p className="text-sm">Keine Impfungen erfasst</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Plausibilitätsprüfung: {warnings.length} Hinweis{warnings.length !== 1 ? "e" : ""} bei nicht signierten Einträgen
          </div>
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w.type} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {w.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[220px]">Impfstoff</TableHead>
            <TableHead>Hersteller</TableHead>
            <TableHead>Charge</TableHead>
            <TableHead>Datum</TableHead>
            <TableHead>Gültig bis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {vaccinations.map((v) => (
            <VaccinationRow key={v.id} vaccination={v} patientId={patientId} />
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
