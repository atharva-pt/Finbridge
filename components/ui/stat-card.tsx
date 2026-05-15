"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "flat";
  iconColor?: string;
  iconBg?: string;
  index?: number;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  trend,
  iconColor = "text-indigo-400",
  iconBg = "bg-indigo-500/10 border-indigo-500/20",
  index = 0,
}: StatCardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-muted-foreground";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground tracking-tight mb-1">{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
    </motion.div>
  );
}
