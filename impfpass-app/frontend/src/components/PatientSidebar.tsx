import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, User, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { authFetch } from "@/lib/auth";
import type { PatientListItem } from "@/types/patient";

interface Props {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

async function fetchPatients(search: string): Promise<PatientListItem[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await authFetch(`/api/v1/patients${params}`);
  if (!res.ok) throw new Error("Fehler beim Laden");
  return res.json();
}

export default function PatientSidebar({ selectedId, onSelect }: Props) {
  const [search, setSearch] = useState("");

  const { data: patients = [], isLoading, isError } = useQuery({
    queryKey: ["patients", search],
    queryFn: () => fetchPatients(search),
  });

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">IP</span>
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">
            DigitalImpfpass
          </span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Praxisverwaltung</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Patient suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <Separator />

      {/* Patientenzähler */}
      <div className="px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Patienten {patients.length > 0 && `· ${patients.length}`}
        </p>
      </div>

      {/* Liste */}
      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Fehler beim Laden
          </div>
        )}
        {!isLoading && patients.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            Keine Patienten gefunden
          </div>
        )}
        <div className="space-y-0.5 p-2">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent ${
                selectedId === p.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.last_name}, {p.first_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID {p.id} · {p.birth_date}
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {p.vaccination_count}×
                  </span>
                  {p.needs_review_count > 0 && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                      {p.needs_review_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
