import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, PenLine, AlertCircle } from "lucide-react";

interface ActivityItem {
  id: number;
  type: "upload" | "verify" | "edit" | "review";
  patient: string;
  description: string;
  time: string;
}

const mockActivity: ActivityItem[] = [
  { id: 1, type: "upload", patient: "Mustermann, Max", description: "2 Seiten hochgeladen", time: "vor 5 Min." },
  { id: 2, type: "verify", patient: "Schmidt, Anna", description: "COVID-19 signiert", time: "vor 23 Min." },
  { id: 3, type: "review", patient: "Meier, Klaus", description: "Prüfung erforderlich", time: "vor 1 Std." },
  { id: 4, type: "edit", patient: "Weber, Sophie", description: "Chargennummer korrigiert", time: "vor 2 Std." },
  { id: 5, type: "verify", patient: "Fischer, Hans", description: "3 Impfungen signiert", time: "vor 3 Std." },
];

const typeConfig = {
  upload: { icon: Upload, color: "text-primary", bg: "bg-primary/10" },
  verify: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  edit: { icon: PenLine, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  review: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
};

const typeBadge = {
  upload: { label: "Upload", variant: "secondary" as const },
  verify: { label: "Signiert", variant: "outline" as const },
  edit: { label: "Korrektur", variant: "outline" as const },
  review: { label: "Prüfung", variant: "destructive" as const },
};

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Aktivität</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {mockActivity.map((item) => {
            const { icon: Icon, color, bg } = typeConfig[item.type];
            const badge = typeBadge[item.type];
            return (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-xs font-medium">{item.patient}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={badge.variant} className="text-[10px] py-0">{badge.label}</Badge>
                  <span className="text-[10px] text-muted-foreground">{item.time}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
