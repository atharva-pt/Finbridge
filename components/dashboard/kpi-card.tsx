"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils";

export type KpiColor = "blue" | "green" | "amber" | "red" | "violet" | "indigo";

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: { value: number; positive: boolean };
  icon: LucideIcon;
  color: KpiColor;
  sparkline?: number[];
  index?: number;
}

const COLOR_MAP: Record<
  KpiColor,
  { bg: string; text: string; spark: string }
> = {
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    spark: "#3b82f6",
  },
  green: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    spark: "#10b981",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    spark: "#f59e0b",
  },
  red: {
    bg: "bg-red-500/10 dark:bg-red-500/15",
    text: "text-red-600 dark:text-red-400",
    spark: "#ef4444",
  },
  violet: {
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    spark: "#8b5cf6",
  },
  indigo: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    text: "text-indigo-600 dark:text-indigo-400",
    spark: "#6366f1",
  },
};

export function KpiCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  sparkline,
  index = 0,
}: KpiCardProps) {
  const colors = COLOR_MAP[color];
  const TrendIcon = change?.positive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative bg-card border border-border rounded-2xl p-5 card-shadow hover:card-shadow-md transition-shadow overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                colors.bg
              )}
            >
              <Icon className={cn("w-4 h-4", colors.text)} />
            </div>
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {value}
            </span>
          </div>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              <TrendIcon
                className={cn(
                  "w-3 h-3",
                  change.positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  change.positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {change.positive ? "+" : "−"}
                {Math.abs(change.value)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <div className="w-24 h-12 shrink-0 self-end -mb-1 -mr-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <Sparkline data={sparkline} color={colors.spark} height={48} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
