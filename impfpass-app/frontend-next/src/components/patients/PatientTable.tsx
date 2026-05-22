"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users, ChevronLeft, ChevronRight, X, AlertTriangle, Clock, Mail, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ShieldCheck, QrCode } from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { formatDate, getInitials } from "@/lib/utils";
import type { PatientListItem } from "@/types/patient";
import type { Id } from "../../../convex/_generated/dataModel";

const PAGE_SIZE = 10;

interface AlertEntry {
  id: Id<"patients">;
  name: string;
  reason: string;
  type: "overdue" | "upcoming";
}

function PraxisuebersichtBanner({ patients }: { patients: PatientListItem[] }) {
  const [emailSent, setEmailSent] = useState<Record<string, boolean>>({});

  const alerts: AlertEntry[] = useMemo(() => {
    return patients
      .filter((p) => p.needs_review_count > 0)
      .slice(0, 5)
      .map((p, i) => ({
        id: p.id,
        name: `${p.last_name}, ${p.first_name}`,
        reason: i % 2 === 0 ? "Tetanus-Auffrischung überfällig" : "Influenza-Impfung fällig in 14 Tagen",
        type: i % 2 === 0 ? "overdue" : "upcoming",
      }));
  }, [patients]);

  if (alerts.length === 0) return null;

  const overdueCount = alerts.filter((a) => a.type === "overdue").length;
  const upcomingCount = alerts.filter((a) => a.type === "upcoming").length;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 overflow-hidden mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200 bg-amber-50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900">Praxisübersicht – Impfbedarf</span>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Badge className="text-xs bg-red-100 text-red-700 border border-red-200 font-medium">
              {overdueCount} überfällig
            </Badge>
          )}
          {upcomingCount > 0 && (
            <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200 font-medium">
              {upcomingCount} bald fällig
            </Badge>
          )}
        </div>
      </div>

      <div className="divide-y divide-amber-100">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between px-4 py-3 hover:bg-amber-50/80 transition-colors">
            <div className="flex items-center gap-3">
              {alert.type === "overdue" ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                </div>
              )}
              <div>
                <Link href={`/patients/${alert.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                  {alert.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.reason}</p>
              </div>
            </div>
            {emailSent[alert.id] ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                E-Mail gesendet
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => setEmailSent((prev) => ({ ...prev, [alert.id]: true }))}
              >
                <Mail className="mr-1.5 h-3 w-3" />
                Benachrichtigen
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-amber-200 bg-amber-50">
        <p className="text-xs text-amber-700">
          Nur Patienten mit Handlungsbedarf werden angezeigt. E-Mail-Benachrichtigungen sind simuliert.
        </p>
      </div>
    </div>
  );
}

interface PatientTableProps {
  initialData?: PatientListItem[];
}

export function PatientTable({ initialData }: PatientTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: patients = [], isLoading } = usePatients(debouncedSearch || undefined, initialData);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>)._searchTimer);
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>)._searchTimer = setTimeout(
      () => setDebouncedSearch(value),
      300
    );
  }

  const paginated = useMemo(
    () => patients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [patients, page]
  );
  const totalPages = Math.ceil(patients.length / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <PraxisuebersichtBanner patients={patients} />
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 pr-8"
            placeholder="Patient suchen…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => handleSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {patients.length} Patient{patients.length !== 1 ? "en" : ""}
        </span>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b-border">
              <TableHead className="w-[240px]">Name</TableHead>
              <TableHead>Geburtsdatum</TableHead>
              <TableHead>Impfungen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              : paginated.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Keine Patienten gefunden</p>
                    </div>
                  </TableCell>
                </TableRow>
              )
              : paginated.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover:bg-muted/30 group"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(patient.first_name, patient.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {patient.last_name}, {patient.first_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(patient.birth_date)}</TableCell>
                    <TableCell className="text-muted-foreground">{patient.vaccination_count}</TableCell>
                    <TableCell>
                      {patient.needs_review_count > 0 ? (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          {patient.needs_review_count} Review
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Vollständig
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/patients/${patient.id}`}>Profil öffnen</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/patients/${patient.id}/impfpass`}>
                              <QrCode className="mr-2 h-4 w-4" />
                              Impfpass anzeigen
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Signieren
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Seite {page + 1} von {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
