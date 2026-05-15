import { cn } from "@/lib/utils";

type TransactionStatus = "PENDING" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "NEEDS_INFO";

interface StatusBadgeProps {
  status: TransactionStatus | string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className:
      "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  },
  ACCEPTED: {
    label: "Accepted",
    className:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  REJECTED: {
    label: "Rejected",
    className:
      "bg-red-500/10 text-red-700 border-red-500/30 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  },
  NEEDS_INFO: {
    label: "Needs Info",
    className:
      "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {config.label}
    </span>
  );
}
