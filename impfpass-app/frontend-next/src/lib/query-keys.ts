export const queryKeys = {
  patients: {
    all: ["patients"] as const,
    list: (search?: string) => ["patients", "list", search ?? ""] as const,
    detail: (id: string) => ["patients", id] as const,
  },
  documents: {
    byPatient: (patientId: string) => ["documents", patientId] as const,
  },
};
