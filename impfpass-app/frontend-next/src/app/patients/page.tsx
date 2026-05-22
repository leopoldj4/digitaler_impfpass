import { api } from "@/lib/api-client";
import { PatientTable } from "@/components/patients/PatientTable";
import { TopBar } from "@/components/layout/TopBar";

export default async function PatientsPage() {
  let initialData = undefined;
  try {
    initialData = await api.patients.list();
  } catch {
    // fallback to client-side fetch
  }

  return (
    <>
      <TopBar crumbs={[{ label: "Patienten" }]} />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">Patienten</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Patientenakten verwalten und Impfpässe einsehen.
          </p>
        </div>
        <PatientTable initialData={initialData} />
      </main>
    </>
  );
}
