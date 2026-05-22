import { PatientDetailClient } from "./PatientDetailClient";
import type { Id } from "../../../../convex/_generated/dataModel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;
  return <PatientDetailClient patientId={id as Id<"patients">} />;
}
