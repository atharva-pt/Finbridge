"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Insight {
  icon: string;
  title: string;
  description: string;
  type: "positive" | "negative" | "neutral" | "warning";
}

const ICON_MAP: Record<string, React.ElementType> = {
  "trend-up": TrendingUp,
  "trend-down": TrendingDown,
  alert: AlertTriangle,
  sparkle: Sparkles,
  check: CheckCircle2,
  clock: Clock,
};

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string; glow: string }> = {
  positive: {
    bg: "bg-emerald-50/80 dark:bg-emerald-500/10",
    border: "border-emerald-200/60 dark:border-emerald-500/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    glow: "shadow-emerald-500/5",
  },
  negative: {
    bg: "bg-red-50/80 dark:bg-red-500/10",
    border: "border-red-200/60 dark:border-red-500/20",
    icon: "text-red-600 dark:text-red-400",
    glow: "shadow-red-500/5",
  },
  warning: {
    bg: "bg-amber-50/80 dark:bg-amber-500/10",
    border: "border-amber-200/60 dark:border-amber-500/20",
    icon: "text-amber-600 dark:text-amber-400",
    glow: "shadow-amber-500/5",
  },
  neutral: {
    bg: "bg-slate-50/80 dark:bg-slate-500/10",
    border: "border-slate-200/60 dark:border-slate-500/20",
    icon: "text-slate-600 dark:text-slate-400",
    glow: "shadow-slate-500/5",
  },
};

export function AiInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/ai/insights");
      const data = await res.json();
      setInsights(data.insights ?? []);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              AI Insights
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Powered by Claude
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          : insights.map((insight, i) => {
              const style = TYPE_STYLES[insight.type] ?? TYPE_STYLES.neutral;
              const Icon = ICON_MAP[insight.icon] ?? Sparkles;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.3 }}
                  className={`${style.bg} border ${style.border} rounded-2xl p-4 ${style.glow} shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4.5 h-4.5 ${style.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {insight.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
      </div>
    </motion.div>
  );
}
