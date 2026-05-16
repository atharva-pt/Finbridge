"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Anomaly {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
}

interface FlaggedTransaction {
  transactionId: string;
  vendorName: string;
  amount: number;
  anomalies: Anomaly[];
}

interface AnomalyData {
  totalAnomalies: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  flaggedTransactions: FlaggedTransaction[];
}

const SEVERITY_CONFIG = {
  high: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500", icon: AlertTriangle },
  medium: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", icon: AlertCircle },
  low: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500", icon: Info },
};

export function AnomalySummaryCard() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/firm/anomalies")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 card-shadow space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || data.totalAnomalies === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-5 card-shadow"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <ShieldAlert className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Anomaly Detection</h2>
            <p className="text-xs text-muted-foreground">AI-powered fraud monitoring</p>
          </div>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-foreground">All Clear</p>
          <p className="text-xs text-muted-foreground mt-1">No anomalies detected in pending transactions</p>
        </div>
      </motion.div>
    );
  }

  const topFlagged = data.flaggedTransactions.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-card border border-border rounded-2xl p-5 card-shadow"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
            </div>
            {data.highSeverity > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                <span className="text-[9px] font-bold text-white">{data.highSeverity}</span>
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Anomaly Detection</h2>
            <p className="text-xs text-muted-foreground">AI-powered fraud monitoring</p>
          </div>
        </div>
      </div>

      {/* Severity breakdown */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-xl">
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{data.highSeverity}</p>
          <p className="text-[10px] text-muted-foreground">High</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{data.mediumSeverity ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Medium</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex-1 text-center">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{data.lowSeverity ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Low</p>
        </div>
      </div>

      {/* Flagged transactions */}
      <div className="space-y-2">
        {topFlagged.map((tx) => {
          const topAnomaly = tx.anomalies[0];
          const sev = SEVERITY_CONFIG[topAnomaly?.severity ?? "low"];
          const Icon = sev.icon;
          return (
            <Link
              key={tx.transactionId}
              href={`/firm/transactions/${tx.transactionId}`}
              className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-accent/50 transition-colors group"
            >
              <Icon className={`w-4 h-4 ${sev.color} shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {tx.vendorName || "Unknown vendor"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {topAnomaly?.message}
                </p>
              </div>
              <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                {tx.amount ? `₹${tx.amount.toLocaleString("en-IN")}` : "—"}
              </span>
            </Link>
          );
        })}
      </div>

      {data.flaggedTransactions.length > 3 && (
        <Link
          href="/firm/transactions"
          className="flex items-center justify-center gap-1.5 mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all {data.flaggedTransactions.length} flagged
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </motion.div>
  );
}
