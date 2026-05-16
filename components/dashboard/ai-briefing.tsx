"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";

export function AiBriefing() {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchBriefing(force = false) {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/ai/briefing");
      if (res.ok) {
        const data = await res.json();
        setBriefing(data.briefing);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-card border border-border rounded-2xl p-5 card-shadow"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-2.5 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-4/5 bg-muted rounded animate-pulse" />
          <div className="h-3 w-3/5 bg-muted rounded animate-pulse" />
        </div>
      </motion.div>
    );
  }

  if (!briefing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="relative overflow-hidden bg-card border border-border rounded-2xl p-5 card-shadow"
    >
      {/* Subtle gradient accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-25"
        style={{
          background:
            "radial-gradient(600px circle at 0% 0%, oklch(0.78 0.18 280 / 0.15), transparent 60%)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                AI Morning Briefing
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Powered by Claude
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchBriefing(true)}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-accent"
            title="Refresh briefing"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed">
          {briefing}
        </p>
      </div>
    </motion.div>
  );
}
