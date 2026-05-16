"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Database,
  Brain,
  Server,
  Users,
  Building2,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface HealthData {
  status: string;
  version: string;
  uptime: string;
  timestamp: string;
  services: {
    database: string;
    ai: { claude: string; openai: string };
  };
  stats: {
    users: number;
    firms: number;
    companies: number;
    transactions: number;
    documents: number;
  };
  environment: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "connected" || status === "configured" || status === "healthy")
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === "degraded" || status === "missing_key")
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function statusColor(status: string) {
  if (status === "connected" || status === "configured" || status === "healthy")
    return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (status === "degraded" || status === "missing_key")
    return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20";
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchHealth(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) setHealth(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            Unable to reach health endpoint
          </p>
        </div>
      </div>
    );
  }

  const services = [
    { name: "PostgreSQL Database", status: health.services.database, icon: Database },
    { name: "Claude AI (Anthropic)", status: health.services.ai.claude, icon: Brain },
    { name: "GPT-4o (OpenAI)", status: health.services.ai.openai, icon: Brain },
  ];

  const platformStats = [
    { label: "Users", value: health.stats.users, icon: Users },
    { label: "Firms", value: health.stats.firms, icon: Building2 },
    { label: "Companies", value: health.stats.companies, icon: Building2 },
    { label: "Transactions", value: health.stats.transactions, icon: FileText },
    { label: "Documents", value: health.stats.documents, icon: FileText },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            System Health
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform infrastructure and service status
          </p>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-border bg-background text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* Overall Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`rounded-2xl border p-5 flex items-center justify-between ${statusColor(health.status)}`}
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={health.status} />
          <div>
            <p className="text-sm font-semibold capitalize">
              System {health.status}
            </p>
            <p className="text-xs opacity-80">
              v{health.version} · {health.environment} · Uptime: {health.uptime}
            </p>
          </div>
        </div>
        <div className="text-xs opacity-70 tabular-nums">
          {new Date(health.timestamp).toLocaleString("en-IN")}
        </div>
      </motion.div>

      {/* Service Status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl card-shadow overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            Service Status
          </h2>
        </div>
        <div className="divide-y divide-border">
          {services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <svc.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{svc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon status={svc.status} />
                <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${statusColor(svc.status)}`}>
                  {svc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Platform Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-sm font-semibold text-foreground tracking-tight mb-3">
          Platform Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {platformStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              className="bg-card border border-border rounded-xl p-4 card-shadow text-center"
            >
              <stat.icon className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Architecture Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-card border border-border rounded-2xl card-shadow p-5"
      >
        <h2 className="text-sm font-semibold text-foreground tracking-tight mb-4">
          Architecture
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            ["Framework", "Next.js 16 (App Router + Turbopack)"],
            ["Database", "PostgreSQL + Prisma ORM"],
            ["AI Extraction", "Claude Opus 4.5 (Vision)"],
            ["AI Chat", "Claude Sonnet 4 + GPT-4o Mini"],
            ["Auth", "Cookie-based sessions (bcrypt)"],
            ["Validation", "Zod v4 + Rate Limiting"],
            ["Logging", "Pino (structured JSON)"],
            ["Security", "HSTS, CSP, XSS Protection"],
          ].map(([key, val]) => (
            <div key={key} className="flex items-baseline justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">{key}</span>
              <span className="font-medium text-foreground text-right">{val}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
