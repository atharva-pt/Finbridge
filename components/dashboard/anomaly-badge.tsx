"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Anomaly {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  field?: string;
}

interface AnomalyBadgeProps {
  transactionId: string;
}

const SEVERITY_CONFIG = {
  high: {
    icon: AlertTriangle,
    bg: "bg-red-500/15 dark:bg-red-500/20",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
    dot: "bg-red-500",
    pulse: "animate-pulse",
    label: "High",
    badgeBg: "bg-gradient-to-r from-red-500 to-rose-600",
  },
  medium: {
    icon: AlertCircle,
    bg: "bg-amber-500/15 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
    pulse: "",
    label: "Medium",
    badgeBg: "bg-gradient-to-r from-amber-500 to-orange-500",
  },
  low: {
    icon: Info,
    bg: "bg-blue-500/15 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
    pulse: "",
    label: "Low",
    badgeBg: "bg-gradient-to-r from-blue-500 to-indigo-500",
  },
};

function getMaxSeverity(anomalies: Anomaly[]): "high" | "medium" | "low" {
  if (anomalies.some((a) => a.severity === "high")) return "high";
  if (anomalies.some((a) => a.severity === "medium")) return "medium";
  return "low";
}

export function AnomalyBadge({ transactionId }: AnomalyBadgeProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/transactions/${transactionId}/anomalies`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.anomalies?.length > 0) {
          setAnomalies(data.anomalies);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [transactionId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (anomalies.length === 0) return null;

  const maxSev = getMaxSeverity(anomalies);
  const config = SEVERITY_CONFIG[maxSev];
  const highCount = anomalies.filter((a) => a.severity === "high").length;

  return (
    <div ref={containerRef} className="relative inline-flex">
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          "relative inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-white shadow-lg transition-transform hover:scale-105",
          config.badgeBg
        )}
      >
        {maxSev === "high" && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 animate-ping" />
        )}
        <AlertTriangle className="w-3 h-3" />
        {anomalies.length}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center",
                    config.bg
                  )}
                >
                  <AlertTriangle className={cn("w-3.5 h-3.5", config.text)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {anomalies.length} Anomal{anomalies.length === 1 ? "y" : "ies"} Detected
                  </p>
                  {highCount > 0 && (
                    <p className="text-[10px] text-red-500 font-medium">
                      {highCount} high severity
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Anomaly list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {anomalies.map((anomaly, idx) => {
                const sev = SEVERITY_CONFIG[anomaly.severity];
                const Icon = sev.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        sev.bg
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", sev.text)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {anomaly.type.replace(/_/g, " ")}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md",
                            sev.bg,
                            sev.text
                          )}
                        >
                          <span
                            className={cn("w-1.5 h-1.5 rounded-full", sev.dot, sev.pulse)}
                          />
                          {sev.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {anomaly.message}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
