import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number | null;
  showLabel?: boolean;
}

export function ConfidenceBadge({ score, showLabel = true }: ConfidenceBadgeProps) {
  if (score === null) return null;

  const pct = Math.round(score * 100);
  const filled = Math.round(score * 5);

  const color =
    pct >= 80
      ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20"
      : pct >= 50
        ? "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20"
        : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        color,
      )}
    >
      <span className="tracking-[2px]">
        {"●".repeat(filled)}{"○".repeat(5 - filled)}
      </span>
      {showLabel && <span>{pct}%</span>}
    </span>
  );
}
