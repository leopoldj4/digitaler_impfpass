import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBanner } from "@/components/impfpass/StatusBanner";
import { ImpfpassCard } from "@/components/impfpass/ImpfpassCard";
import { QRCodeSection } from "@/components/impfpass/QRCodeSection";
import { ExportButton } from "@/components/impfpass/ExportButton";
import { Button } from "@/components/ui/button";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ImpfpassPage({ params }: Props) {
  const { id } = await params;
  const patientId = id as Id<"patients">;
  const patient = await api.patients.get(patientId);

  return (
    <>
      <TopBar
        crumbs={[
          { label: "Patienten", href: "/patients" },
          { label: `${patient.first_name} ${patient.last_name}`, href: `/patients/${patientId}` },
          { label: "Impfpass" },
        ]}
        actions={
          <Button variant="ghost" size="sm" asChild className="no-print">
            <Link href={`/patients/${patientId}`}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Zurück
            </Link>
          </Button>
        }
      />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <StatusBanner vaccinations={patient.vaccinations} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ImpfpassCard patient={patient} />
            </div>
            <div className="flex flex-col gap-4">
              <QRCodeSection patientId={patientId} />
              <ExportButton />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
