import { api } from "@/lib/api-client";
import { PatientDetailClient } from "./PatientDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;
  const patientId = parseInt(id, 10);

  let initialData = undefined;
  try {
    initialData = await api.patients.get(patientId);
  } catch {
    // fallback to client-side fetch
  }

  return <PatientDetailClient patientId={patientId} initialData={initialData} />;
}
