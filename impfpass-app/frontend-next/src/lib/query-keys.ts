export const queryKeys = {
  patients: {
    all: ["patients"] as const,
    list: (search?: string) => ["patients", "list", search ?? ""] as const,
    detail: (id: number) => ["patients", id] as const,
  },
  documents: {
    byPatient: (patientId: number) => ["documents", patientId] as const,
  },
};
