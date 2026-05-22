"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/layout/TopBar";
import { PatientHeader } from "@/components/patient-detail/PatientHeader";
import { ImpfungenTab } from "@/components/patient-detail/ImpfungenTab";
import { DokumenteTab } from "@/components/patient-detail/DokumenteTab";
import { StammdatenTab } from "@/components/patient-detail/StammdatenTab";
import { SignaturenTab } from "@/components/patient-detail/SignaturenTab";
import { SignatureSheet } from "@/components/patient-detail/SignatureSheet";
import { usePatient } from "@/hooks/usePatient";
import type { PatientDetail } from "@/types/patient";

interface PatientDetailClientProps {
  patientId: number;
  initialData?: PatientDetail;
}

export function PatientDetailClient({ patientId, initialData }: PatientDetailClientProps) {
  const { data: patient, isLoading } = usePatient(patientId, initialData);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState(false);

  if (isLoading || !patient) {
    return (
      <>
        <TopBar crumbs={[{ label: "Patienten", href: "/patients" }, { label: "…" }]} />
        <div className="p-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Patienten", href: "/patients" },
          { label: `${patient.first_name} ${patient.last_name}` },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/patients/${patientId}/impfpass`} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Impfpass
            </Link>
          </Button>
        }
      />

      <PatientHeader
        patient={patient}
        onSign={() => setSheetOpen(true)}
        onUpload={() => setUploadTab(true)}
      />

      <div className="flex-1 p-6">
        <Tabs
          defaultValue="vaccinations"
          value={uploadTab ? "documents" : undefined}
          onValueChange={(v) => { if (v !== "documents") setUploadTab(false); }}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="vaccinations">Impfungen</TabsTrigger>
            <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
            <TabsTrigger value="documents" onClick={() => setUploadTab(false)}>Dokumente</TabsTrigger>
            <TabsTrigger value="signatures">Signaturen</TabsTrigger>
          </TabsList>

          <TabsContent value="vaccinations">
            <ImpfungenTab vaccinations={patient.vaccinations} patientId={patientId} />
          </TabsContent>

          <TabsContent value="stammdaten">
            <StammdatenTab patient={patient} />
          </TabsContent>

          <TabsContent value="documents">
            <DokumenteTab documents={patient.documents} patientId={patientId} />
          </TabsContent>

          <TabsContent value="signatures">
            <SignaturenTab />
          </TabsContent>
        </Tabs>
      </div>

      <SignatureSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vaccinations={patient.vaccinations}
        patientId={patientId}
      />
    </>
  );
}
