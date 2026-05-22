import type { Vaccination } from "@/types/vaccination";

export type WarningType = "invalid_date" | "cluster_dates" | "invalid_batch";

export interface PlausibilityWarning {
  type: WarningType;
  label: string;
  affectedIds: string[];
}

export function checkPlausibility(
  vaccinations: Vaccination[],
  birthDate: string
): PlausibilityWarning[] {
  const unsigned = vaccinations.filter((v) => !v.is_verified);
  if (unsigned.length === 0) return [];

  const warnings: PlausibilityWarning[] = [];
  const birth = new Date(birthDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // 1. Ungültiges Datum: vor Geburtsdatum oder in der Zukunft
  const invalidDate = unsigned.filter((v) => {
    if (!v.vaccination_date) return false;
    const d = new Date(v.vaccination_date);
    return d < birth || d > today;
  });
  if (invalidDate.length > 0) {
    warnings.push({
      type: "invalid_date",
      label: "Ungültiges Datum",
      affectedIds: invalidDate.map((v) => v.id as string),
    });
  }

  // 2. Mehr als 2 Impfungen innerhalb von 3 Tagen
  const withDate = unsigned
    .filter((v) => v.vaccination_date)
    .sort((a, b) => a.vaccination_date!.localeCompare(b.vaccination_date!));

  const clusterIds = new Set<string>();
  for (let i = 0; i < withDate.length; i++) {
    const windowStart = new Date(withDate[i].vaccination_date!).getTime();
    let j = i + 1;
    while (j < withDate.length) {
      const diffDays =
        (new Date(withDate[j].vaccination_date!).getTime() - windowStart) /
        86_400_000;
      if (diffDays <= 3) j++;
      else break;
    }
    if (j - i > 2) {
      for (let k = i; k < j; k++) clusterIds.add(withDate[k].id as string);
    }
  }
  if (clusterIds.size > 0) {
    warnings.push({
      type: "cluster_dates",
      label: "Viele Impfungen in sehr kurzer Zeit",
      affectedIds: [...clusterIds],
    });
  }

  // 3. Ungültige Chargennummer: enthält nicht-alphanumerische Zeichen
  const invalidBatch = unsigned.filter(
    (v) => v.batch_number != null && !/^[A-Za-z0-9]+$/.test(v.batch_number)
  );
  if (invalidBatch.length > 0) {
    warnings.push({
      type: "invalid_batch",
      label: "Ungültige Chargennummer",
      affectedIds: invalidBatch.map((v) => v.id as string),
    });
  }

  return warnings;
}
