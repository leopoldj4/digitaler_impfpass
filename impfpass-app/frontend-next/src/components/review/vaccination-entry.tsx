"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { ConfidenceBadge } from "./confidence-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Vaccination, VaccinationUpdate } from "@/types/vaccination";
import type { Id } from "../../../convex/_generated/dataModel";

const schema = z.object({
  vaccine_name: z.string().min(1, "Pflichtfeld"),
  vaccination_date: z.string().nullable(),
  batch_number: z.string().nullable(),
  doctor_stamp: z.string().nullable(),
  manufacturer: z.string().nullable(),
  needs_review: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface VaccinationEntryProps {
  vaccination: Vaccination;
  index: number;
  onSave: (id: Id<"vaccinations">, data: VaccinationUpdate) => Promise<void>;
  onDelete?: (id: Id<"vaccinations">) => void;
}

export function VaccinationEntry({ vaccination, index, onSave, onDelete }: VaccinationEntryProps) {
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty }, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vaccine_name: vaccination.vaccine_name ?? "",
      vaccination_date: vaccination.vaccination_date ?? null,
      batch_number: vaccination.batch_number ?? null,
      doctor_stamp: vaccination.doctor_stamp ?? null,
      manufacturer: vaccination.manufacturer ?? null,
      needs_review: vaccination.needs_review,
    },
  });

  const needsReview = watch("needs_review");

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await onSave(vaccination.id, data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">{vaccination.vaccine_name}</span>
          {vaccination.vaccination_date && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(vaccination.vaccination_date).toLocaleDateString("de")}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ConfidenceBadge score={vaccination.confidence_score} />
          {vaccination.is_verified ? (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
              Signiert
            </Badge>
          ) : needsReview ? (
            <Badge variant="destructive" className="text-[10px]">Prüfung</Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">Ausstehend</Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-3 border-t px-4 pb-4 pt-3">
          <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Impfstoff *</Label>
              <Input {...register("vaccine_name")} className="h-8 text-sm" />
              {errors.vaccine_name && (
                <p className="text-[10px] text-destructive">{errors.vaccine_name.message}</p>
              )}
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Datum</Label>
              <Input type="date" {...register("vaccination_date")} className="h-8 text-sm" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Chargennummer</Label>
              <Input {...register("batch_number")} className="h-8 text-sm" placeholder="z.B. ABC123" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Arzt / Stempel</Label>
              <Input {...register("doctor_stamp")} className="h-8 text-sm" placeholder="z.B. Dr. Mueller" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs">Hersteller</Label>
              <Input {...register("manufacturer")} className="h-8 text-sm" placeholder="z.B. BioNTech" />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <Switch
              id={`review-${vaccination.id}`}
              checked={needsReview}
              onCheckedChange={(v) => setValue("needs_review", v, { shouldDirty: true })}
            />
            <Label htmlFor={`review-${vaccination.id}`} className="cursor-pointer text-xs">
              Prüfung erforderlich
            </Label>
          </div>

          <div className="flex items-center justify-between gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-destructive hover:text-destructive"
                onClick={() => onDelete(vaccination.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Löschen
              </Button>
            )}
            <div className="ml-auto">
              <Button
                type="submit"
                size="sm"
                className="text-xs"
                disabled={!isDirty || saving}
              >
                {saving ? "Speichern …" : "Speichern"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
