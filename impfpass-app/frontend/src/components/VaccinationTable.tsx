import { useState } from "react";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Vaccination, VaccinationUpdate } from "@/types/vaccination";

const PERFORMED_BY = "Dr. Demo";

interface Props {
  vaccinations: Vaccination[];
  onUpdate?: (updated: Vaccination) => void;
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ v }: { v: Vaccination }) {
  if (v.is_verified)
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Verifiziert ✓</Badge>;
  if (v.confidence_score !== null && v.confidence_score < 0.75)
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Prüfung nötig</Badge>;
  if (!v.needs_review)
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">Ausstehend</Badge>;
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Prüfung nötig</Badge>;
}

// ---------------------------------------------------------------------------
// Editierbare Zeile
// ---------------------------------------------------------------------------

function EditableRow({ vaccination: v, onUpdate }: { vaccination: Vaccination; onUpdate?: (u: Vaccination) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<VaccinationUpdate>({
    vaccine_name: v.vaccine_name,
    vaccination_date: v.vaccination_date ?? "",
    valid_until: v.valid_until ?? "",
    batch_number: v.batch_number ?? "",
    doctor_stamp: v.doctor_stamp ?? "",
  });

  function set(field: keyof VaccinationUpdate, value: string) {
    setDraft((p) => ({ ...p, [field]: value }));
  }

  function cancel() {
    setDraft({ vaccine_name: v.vaccine_name, vaccination_date: v.vaccination_date ?? "",
      valid_until: v.valid_until ?? "", batch_number: v.batch_number ?? "", doctor_stamp: v.doctor_stamp ?? "" });
    setError(null);
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/vaccinations/${v.id}?performed_by=${encodeURIComponent(PERFORMED_BY)}`,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail ?? `Fehler ${res.status}`);
      }
      onUpdate?.(await res.json());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  const cell = "py-3";
  const inp = "h-7 text-xs";

  return (
    <>
      <TableRow className={editing ? "bg-blue-50/50" : undefined}>
        <TableCell className={cell}>
          {editing
            ? <Input className={inp} value={draft.vaccine_name ?? ""} onChange={(e) => set("vaccine_name", e.target.value)} />
            : <span className="font-medium text-sm">{v.vaccine_name}</span>}
          {v.vaccine_type && !editing && <p className="text-xs text-muted-foreground">{v.vaccine_type}</p>}
        </TableCell>

        <TableCell className={cell}>
          {editing
            ? <Input type="date" className={inp} value={draft.vaccination_date ?? ""} onChange={(e) => set("vaccination_date", e.target.value)} />
            : <span className="text-sm tabular-nums">{v.vaccination_date ?? "–"}</span>}
        </TableCell>

        <TableCell className={cell}>
          {editing
            ? <Input type="date" className={inp} value={draft.valid_until ?? ""} onChange={(e) => set("valid_until", e.target.value)} />
            : <span className="text-sm tabular-nums">{v.valid_until ?? "–"}</span>}
        </TableCell>

        <TableCell className={cell}>
          {editing
            ? <Input className={inp} value={draft.batch_number ?? ""} onChange={(e) => set("batch_number", e.target.value)} />
            : <span className="font-mono text-xs text-muted-foreground">{v.batch_number ?? "–"}</span>}
        </TableCell>

        <TableCell className={`${cell} max-w-[160px]`}>
          {editing
            ? <Input className={inp} value={draft.doctor_stamp ?? ""} onChange={(e) => set("doctor_stamp", e.target.value)} />
            : <span className="text-xs text-muted-foreground truncate block">{v.doctor_stamp ?? "–"}</span>}
        </TableCell>

        <TableCell className={cell}>
          <StatusBadge v={v} />
        </TableCell>

        <TableCell className={`${cell} text-right`}>
          {editing ? (
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancel} disabled={saving}>
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" className="h-7 w-7" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </TableCell>
      </TableRow>

      {error && (
        <TableRow>
          <TableCell colSpan={7} className="bg-red-50 py-1.5 text-xs text-red-600">
            {error}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Haupt-Komponente
// ---------------------------------------------------------------------------

export default function VaccinationTable({ vaccinations, onUpdate }: Props) {
  const [rows, setRows] = useState<Vaccination[]>(vaccinations);

  function handleUpdate(updated: Vaccination) {
    setRows((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    onUpdate?.(updated);
  }

  if (rows.length === 0)
    return <p className="py-12 text-center text-sm text-muted-foreground">Keine Impfeinträge vorhanden.</p>;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {["Impfung", "Datum", "Gültig bis", "Charge", "Arzt", "Status", ""].map((h) => (
              <TableHead key={h} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((v) => (
            <EditableRow key={v.id} vaccination={v} onUpdate={handleUpdate} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
