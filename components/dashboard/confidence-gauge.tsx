import { cn } from "@/lib/utils";

interface ConfidenceGaugeProps {
  score?: number | null;
  className?: string;
  showLabel?: boolean;
}

export function ConfidenceGauge({ score, className, showLabel = true }: ConfidenceGaugeProps) {
  if (score === undefined || score === null) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }

  const pct = Math.round(score * 100);
  const tone =
    pct >= 85
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15"
      : pct >= 65
      ? "text-amber-600 dark:text-amber-400 bg-amber-500/15"
      : "text-red-600 dark:text-red-400 bg-red-500/15";

  return (
    <div className={cn("flex items-center gap-2 min-w-[3rem]", className)}>
      <div className="relative w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", {
            "bg-emerald-500": pct >= 85,
            "bg-amber-500": pct >= 65 && pct < 85,
            "bg-red-500": pct < 65,
          })}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={cn(
            "text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md",
            tone
          )}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
