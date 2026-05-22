"use client";

import { useState } from "react";
import { Pencil, Check, X, ShieldCheck, AlertTriangle, Clock, XCircle } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, getVaccinationStatus } from "@/lib/utils";
import type { Vaccination, VaccinationUpdate } from "@/types/vaccination";
import { useVaccinationUpdate } from "@/hooks/useVaccinationMutations";

const statusConfig = {
  verified: { label: "Signiert", icon: ShieldCheck, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Ausstehend", icon: Clock, className: "bg-amber-50 text-amber-700 border-amber-200" },
  review: { label: "Review nötig", icon: AlertTriangle, className: "bg-red-50 text-red-700 border-red-200" },
  expired: { label: "Abgelaufen", icon: XCircle, className: "bg-slate-100 text-slate-600 border-slate-200" },
};

interface VaccinationRowProps {
  vaccination: Vaccination;
  patientId: number;
}

export function VaccinationRow({ vaccination: v, patientId }: VaccinationRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<VaccinationUpdate>({});
  const { mutate, isPending } = useVaccinationUpdate(patientId);

  const status = getVaccinationStatus(v.is_verified, v.needs_review, v.valid_until);
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  function startEdit() {
    setDraft({
      vaccine_name: v.vaccine_name,
      manufacturer: v.manufacturer ?? "",
      batch_number: v.batch_number ?? "",
      vaccination_date: v.vaccination_date ?? "",
      valid_until: v.valid_until ?? "",
      doctor_stamp: v.doctor_stamp ?? "",
    });
    setEditing(true);
  }

  function save() {
    mutate(
      { id: v.id, data: draft },
      { onSuccess: () => setEditing(false) }
    );
  }

  if (editing) {
    return (
      <TableRow className="bg-primary/5">
        <TableCell className="py-2">
          <Input
            className="h-8 text-sm"
            value={draft.vaccine_name ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, vaccine_name: e.target.value }))}
          />
        </TableCell>
        <TableCell className="py-2">
          <Input
            className="h-8 text-sm"
            value={draft.manufacturer ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, manufacturer: e.target.value }))}
          />
        </TableCell>
        <TableCell className="py-2">
          <Input
            className="h-8 text-sm"
            value={draft.batch_number ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, batch_number: e.target.value }))}
          />
        </TableCell>
        <TableCell className="py-2">
          <Input
            type="date"
            className="h-8 text-sm"
            value={draft.vaccination_date ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, vaccination_date: e.target.value }))}
          />
        </TableCell>
        <TableCell className="py-2">
          <Input
            type="date"
            className="h-8 text-sm"
            value={draft.valid_until ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, valid_until: e.target.value }))}
          />
        </TableCell>
        <TableCell className="py-2" />
        <TableCell className="py-2">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700" onClick={save} disabled={isPending}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="group hover:bg-muted/30">
      <TableCell className="font-medium">{v.vaccine_name}</TableCell>
      <TableCell className="text-muted-foreground">{v.manufacturer ?? "—"}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{v.batch_number ?? "—"}</TableCell>
      <TableCell>{formatDate(v.vaccination_date)}</TableCell>
      <TableCell>{formatDate(v.valid_until)}</TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`gap-1 text-xs ${cfg.className}`}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {v.is_verified && v.verified_by
              ? `Signiert von ${v.verified_by} am ${formatDate(v.verified_at)}`
              : v.needs_review
              ? `Konfidenz: ${((v.confidence_score ?? 0) * 100).toFixed(0)}% – Überprüfung empfohlen`
              : "Noch nicht signiert"}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={startEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
