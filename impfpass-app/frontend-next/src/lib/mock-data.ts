export const MOCK_DASHBOARD_STATS = {
  totalPatients: 247,
  verifiedThisMonth: 89,
  pendingReview: 14,
  documentsProcessed: 1834,
};

export const MOCK_MONTHLY_DATA = [
  { month: "Dez", vaccinations: 34, verified: 28 },
  { month: "Jan", vaccinations: 52, verified: 44 },
  { month: "Feb", vaccinations: 41, verified: 38 },
  { month: "Mär", vaccinations: 67, verified: 59 },
  { month: "Apr", vaccinations: 78, verified: 72 },
  { month: "Mai", vaccinations: 89, verified: 83 },
];

export const MOCK_STATUS_DATA = [
  { name: "Verifiziert", value: 892, color: "#10b981" },
  { name: "Ausstehend", value: 156, color: "#f59e0b" },
  { name: "Review nötig", value: 47, color: "#ef4444" },
];

export const MOCK_ACTIVITY = [
  { id: 1, action: "VERIFY", patient: "Max Mustermann", detail: "7 Impfungen signiert", by: "Dr. Erika Meier", at: new Date(Date.now() - 5 * 60_000).toISOString() },
  { id: 2, action: "UPLOAD", patient: "Anna Schmidt", detail: "2 Dokumente hochgeladen", by: "Sabine Koch", at: new Date(Date.now() - 18 * 60_000).toISOString() },
  { id: 3, action: "IMPORT", patient: "Klaus Weber", detail: "Impfpass importiert (6 Einträge)", by: "System", at: new Date(Date.now() - 45 * 60_000).toISOString() },
  { id: 4, action: "UPDATE", patient: "Laura Fischer", detail: "Charge geändert: B005821", by: "Dr. Thomas Bauer", at: new Date(Date.now() - 2 * 3600_000).toISOString() },
  { id: 5, action: "VERIFY", patient: "Thomas Becker", detail: "8 Impfungen signiert", by: "Dr. Erika Meier", at: new Date(Date.now() - 3 * 3600_000).toISOString() },
  { id: 6, action: "UPLOAD", patient: "Sabine Müller", detail: "1 Dokument hochgeladen", by: "Sabine Koch", at: new Date(Date.now() - 5 * 3600_000).toISOString() },
  { id: 7, action: "IMPORT", patient: "Peter Hoffmann", detail: "Impfpass importiert (9 Einträge)", by: "System", at: new Date(Date.now() - 24 * 3600_000).toISOString() },
  { id: 8, action: "VERIFY", patient: "Maria Wagner", detail: "5 Impfungen signiert", by: "Dr. Thomas Bauer", at: new Date(Date.now() - 26 * 3600_000).toISOString() },
];
