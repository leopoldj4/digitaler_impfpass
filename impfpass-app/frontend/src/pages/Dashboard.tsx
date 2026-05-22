import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Calendar, Syringe, AlertTriangle, ShieldCheck, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PatientSidebar from "@/components/PatientSidebar";
import VaccinationTable from "@/components/VaccinationTable";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentGallery from "@/components/DocumentGallery";
import SignatureDialog from "@/components/SignatureDialog";
import type { PatientDetail } from "@/types/patient";
import type { VaccinationDocument } from "@/types/document";

async function fetchPatient(id: number): Promise<PatientDetail> {
  const res = await fetch(`/api/v1/patients/${id}`);
  if (!res.ok) throw new Error("Patient nicht gefunden");
  return res.json();
}

function StatCard({ icon: Icon, label, value, color = "text-foreground" }: {
  icon: React.ElementType; label: string; value: string | number; color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-semibold tabular-nums ${color}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [extractedNotice, setExtractedNotice] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: patient, isLoading, isError } = useQuery({
    queryKey: ["patient", selectedId],
    queryFn: () => fetchPatient(selectedId!),
    enabled: selectedId !== null,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["patient", selectedId] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  }

  function handleUploaded(newDocs: VaccinationDocument[], extractedCount: number) {
    // Dokumente optimistisch einfügen für sofortiges Feedback
    queryClient.setQueryData<PatientDetail>(["patient", selectedId], (old) => {
      if (!old) return old;
      return { ...old, documents: [...old.documents, ...newDocs] };
    });
    // Wenn Extractor Impfungen gefunden hat → vollständig neu laden
    if (extractedCount > 0) {
      invalidate();
      setExtractedNotice(extractedCount);
      setTimeout(() => setExtractedNotice(null), 5000);
    }
  }

  const verifiedCount = patient?.vaccinations.filter((v) => v.is_verified).length ?? 0;
  const reviewCount   = patient?.vaccinations.filter((v) => v.needs_review && !v.is_verified).length ?? 0;
  const allVerified   = patient ? verifiedCount === patient.vaccinations.length && patient.vaccinations.length > 0 : false;
  const hasDocs       = (patient?.documents.length ?? 0) > 0;
  const showReviewBanner = hasDocs && !allVerified;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PatientSidebar selectedId={selectedId} onSelect={setSelectedId} />

      <main className="flex-1 overflow-y-auto">
        {/* Leerzustand */}
        {!selectedId && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Syringe className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Kein Patient ausgewählt</p>
            <p className="text-xs text-muted-foreground">Wähle einen Patienten aus der Liste.</p>
          </div>
        )}

        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {isError && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-destructive">Patient konnte nicht geladen werden.</p>
          </div>
        )}

        {patient && (
          <div className="space-y-5 p-6">
            {/* ── Patientenkopf ── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {patient.last_name}, {patient.first_name}
                  </h1>
                  {allVerified && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                      Vollständig signiert ✓
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Patienten-ID #{patient.id} · geb. {patient.birth_date}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <DocumentUpload patientId={patient.id} onUploaded={handleUploaded} />
                <Button
                  onClick={() => setSignOpen(true)}
                  disabled={allVerified || patient.vaccinations.length === 0}
                  className="gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Digital signieren
                </Button>
              </div>
            </div>

            {/* ── Extraktions-Hinweis (temporär nach Upload) ── */}
            {extractedNotice !== null && (
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <Sparkles className="h-4 w-4 flex-shrink-0 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">
                  {extractedNotice} Impfeintrag{extractedNotice !== 1 ? "e" : ""} automatisch aus dem Scan extrahiert – bitte prüfen.
                </p>
              </div>
            )}

            {/* ── Review-Banner ── */}
            {showReviewBanner && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Bitte Daten auf Richtigkeit prüfen
                  </p>
                  <p className="text-xs text-amber-700">
                    Vergleichen Sie die Scan-Fotos mit den extrahierten Einträgen.
                    Korrekturen können inline vorgenommen werden, danach digital signieren.
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* ── Scan-Fotos (oben, zum Abgleich) ── */}
            {hasDocs && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Originale Impfpass-Scans
                </p>
                <DocumentGallery documents={patient.documents} />
              </div>
            )}

            {/* ── Statistik-Karten ── */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Syringe}       label="Impfungen"  value={patient.vaccinations.length} />
              <StatCard icon={CheckCheck}    label="Signiert"   value={verifiedCount} color="text-emerald-600" />
              <StatCard
                icon={AlertTriangle}
                label="Zu prüfen"
                value={reviewCount}
                color={reviewCount > 0 ? "text-amber-600" : "text-muted-foreground"}
              />
            </div>

            {/* ── Impf-Tabelle (editierbar, unterhalb der Fotos) ── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">
                  Extrahierte Impfeinträge
                </h2>
                <span className="text-xs text-muted-foreground">(aus OCR – bitte prüfen)</span>
              </div>
              <VaccinationTable
                vaccinations={patient.vaccinations}
                onUpdate={invalidate}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── Signatur-Dialog ── */}
      {patient && (
        <SignatureDialog
          open={signOpen}
          onClose={() => setSignOpen(false)}
          vaccinations={patient.vaccinations}
          onSuccess={invalidate}
        />
      )}
    </div>
  );
}
