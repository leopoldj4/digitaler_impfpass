"use client";

import { Syringe } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VaccinationRow } from "./VaccinationRow";
import type { Vaccination } from "@/types/vaccination";
import type { Id } from "../../../convex/_generated/dataModel";

interface ImpfungenTabProps {
  vaccinations: Vaccination[];
  patientId: Id<"patients">;
}

export function ImpfungenTab({ vaccinations, patientId }: ImpfungenTabProps) {
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
