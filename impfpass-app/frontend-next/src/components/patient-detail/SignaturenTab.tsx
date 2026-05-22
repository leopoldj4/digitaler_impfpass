import { ShieldCheck, Upload, FileEdit, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const MOCK_AUDIT = [
  { id: 1, action: "VERIFY", detail: "7 Impfungen digital signiert", by: "Dr. Erika Meier", at: "2024-01-15T10:30:00Z" },
  { id: 2, action: "UPLOAD", detail: "2 Dokumente hochgeladen (Seite 1–2)", by: "Sabine Koch", at: "2024-01-15T08:05:00Z" },
  { id: 3, action: "IMPORT", detail: "Impfpass importiert – 7 Einträge erkannt", by: "System (OCR)", at: "2024-01-15T08:00:00Z" },
  { id: 4, action: "UPDATE", detail: "Charge geändert: B000003 → B001234", by: "Dr. Erika Meier", at: "2024-01-15T10:15:00Z" },
];

const actionConfig: Record<string, { icon: typeof ShieldCheck; className: string; label: string }> = {
  VERIFY: { icon: ShieldCheck, label: "Signiert", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  UPLOAD: { icon: Upload, label: "Upload", className: "bg-blue-50 text-blue-700 border-blue-200" },
  IMPORT: { icon: LogIn, label: "Import", className: "bg-purple-50 text-purple-700 border-purple-200" },
  UPDATE: { icon: FileEdit, label: "Bearbeitet", className: "bg-amber-50 text-amber-700 border-amber-200" },
};

export function SignaturenTab() {
  return (
    <div className="space-y-1">
      {MOCK_AUDIT.map((entry) => {
        const cfg = actionConfig[entry.action] ?? actionConfig.UPDATE;
        const Icon = cfg.icon;
        return (
          <div key={entry.id} className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-muted/30 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
                <span className="text-sm text-foreground">{entry.detail}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {entry.by} · {formatRelativeTime(entry.at)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground/60">{formatDate(entry.at)}</span>
          </div>
        );
      })}
    </div>
  );
}
