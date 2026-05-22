"use client";

import { useState } from "react";
import { Syringe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVaccinationCreate } from "@/hooks/useVaccinationMutations";
import type { Id } from "../../../convex/_generated/dataModel";

interface AddVaccinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: Id<"patients">;
}

const empty = {
  vaccine_name: "",
  vaccine_type: "",
  manufacturer: "",
  batch_number: "",
  vaccination_date: "",
  valid_until: "",
  indication: "",
};

export function AddVaccinationDialog({ open, onOpenChange, patientId }: AddVaccinationDialogProps) {
  const [form, setForm] = useState(empty);
  const { mutate, isPending } = useVaccinationCreate(patientId);

  function set(field: keyof typeof empty) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vaccine_name.trim()) return;
    mutate(
      {
        vaccine_name: form.vaccine_name.trim(),
        vaccine_type: form.vaccine_type.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        batch_number: form.batch_number.trim() || null,
        vaccination_date: form.vaccination_date || null,
        valid_until: form.valid_until || null,
        indication: form.indication.trim() || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm(empty);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Syringe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Neue Impfung eintragen</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Wird als unsignierter Eintrag gespeichert
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="vaccine_name">Impfstoff <span className="text-destructive">*</span></Label>
            <Input
              id="vaccine_name"
              placeholder="z.B. Comirnaty"
              value={form.vaccine_name}
              onChange={set("vaccine_name")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vaccine_type">Impfstofftyp</Label>
              <Input
                id="vaccine_type"
                placeholder="z.B. mRNA"
                value={form.vaccine_type}
                onChange={set("vaccine_type")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manufacturer">Hersteller</Label>
              <Input
                id="manufacturer"
                placeholder="z.B. BioNTech"
                value={form.manufacturer}
                onChange={set("manufacturer")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="batch_number">Chargennummer</Label>
              <Input
                id="batch_number"
                placeholder="z.B. EW0175"
                value={form.batch_number}
                onChange={set("batch_number")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="indication">Indikation</Label>
              <Input
                id="indication"
                placeholder="z.B. Reiseimpfung"
                value={form.indication}
                onChange={set("indication")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vaccination_date">Impfdatum</Label>
              <Input
                id="vaccination_date"
                type="date"
                value={form.vaccination_date}
                onChange={set("vaccination_date")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valid_until">Gültig bis</Label>
              <Input
                id="valid_until"
                type="date"
                value={form.valid_until}
                onChange={set("valid_until")}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isPending || !form.vaccine_name.trim()}>
              {isPending ? "Wird gespeichert…" : "Impfung speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
