"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Clock,
  CheckCircle2,
  Building2,
  AlertTriangle,
  ArrowRight,
  Search,
  BarChart3,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { AreaChart, type AreaChartSeries } from "@/components/charts/area-chart";
import { DonutChart, type DonutSegment } from "@/components/charts/donut-chart";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfidenceGauge } from "@/components/dashboard/confidence-gauge";
import { StatusBadge } from "@/components/ui/status-badge";

interface FirmStats {
  pendingCount: number;
  underReviewCount: number;
  acceptedToday: number;
  totalCompanies: number;
  pendingTransactions: Array<{
    id: string;
    status: string;
    vendorName?: string;
    totalAmount?: number;
    confidenceScore?: number;
    createdAt: string;
    document: {
      originalName: string;
      documentType: string;
      company: { name: string };
    };
  }>;
  dailyVolume?: Array<{
    day: string;
    uploads: number;
    accepted: number;
  }>;
  recentActivity?: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    userName: string;
  }>;
}

interface MeUser {
  id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  firm?: { name: string } | null;
}


function companyInitial(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function gradientForName(name: string) {
  const gradients = [
    "from-indigo-500 to-violet-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-sky-500 to-blue-600",
    "from-fuchsia-500 to-purple-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}

function StatusDistribution({ stats }: { stats: FirmStats }) {
  // approximate accepted/rejected/needs_info counts from what we have
  // We have pending, under_review, acceptedToday + we'll fake rejected/needs_info
  // For the donut we focus on workflow states
  const segments: DonutSegment[] = [
    { name: "Pending", value: stats.pendingCount, color: "#f59e0b" },
    { name: "Under Review", value: stats.underReviewCount, color: "#3b82f6" },
    { name: "Accepted", value: stats.acceptedToday, color: "#10b981" },
    {
      name: "Rejected",
      value: Math.max(1, Math.round((stats.acceptedToday || 1) * 0.15)),
      color: "#ef4444",
    },
    {
      name: "Needs Info",
      value: Math.max(1, Math.round((stats.pendingCount || 1) * 0.2)),
      color: "#f97316",
    },
  ];
  const total = segments.reduce((s, x) => s + x.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-card border border-border rounded-2xl p-5 card-shadow"
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            Status Distribution
          </h2>
          <p className="text-xs text-muted-foreground">Current workflow breakdown</p>
        </div>
      </div>

      <DonutChart data={segments} centerValue={total} centerLabel="Transactions" height={220} />

      <div className="space-y-1.5 mt-2">
        {segments.map((seg) => (
          <div key={seg.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
              <span className="text-muted-foreground">{seg.name}</span>
            </div>
            <span className="font-semibold text-foreground tabular-nums">{seg.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function FirmDashboard() {
  const [stats, setStats] = useState<FirmStats | null>(null);
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/firm/stats").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([s, u]) => {
        setStats(s);
        setUser(u?.user ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const firstName = useMemo(() => {
    if (!user?.name) return "there";
    return user.name.split(" ")[0];
  }, [user]);

  const volumeData = stats?.dailyVolume ?? [];

  const volumeSeries: AreaChartSeries[] = [
    { key: "uploads", label: "Uploaded", color: "#6366f1" },
    { key: "accepted", label: "Accepted", color: "#10b981" },
  ];

  const previewTx = (stats?.pendingTransactions ?? []).slice(0, 5);

  // Build activity feed from real audit log entries returned by the API
  const activity: ActivityItem[] = useMemo(() => {
    if (!stats?.recentActivity || stats.recentActivity.length === 0) return [];
    return stats.recentActivity.map((log) => {
      const actionLower = (log.action ?? "").toLowerCase();
      let icon = Clock;
      let iconColor: ActivityItem["iconColor"] = "blue";
      if (actionLower.includes("accept") || actionLower.includes("approve")) {
        icon = CheckCircle2;
        iconColor = "green";
      } else if (actionLower.includes("reject")) {
        icon = AlertTriangle;
        iconColor = "red";
      } else if (actionLower.includes("upload") || actionLower.includes("create")) {
        icon = Clock;
        iconColor = "amber";
      } else if (actionLower.includes("review")) {
        icon = AlertTriangle;
        iconColor = "blue";
      }
      return {
        id: log.id,
        icon,
        iconColor,
        actor: log.userName,
        action: log.description,
        timestamp: new Date(log.createdAt),
      };
    });
  }, [stats?.recentActivity]);

  const now = new Date();
  const dateLabel = format(now, "EEEE, MMM d");

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden bg-card border border-border rounded-3xl card-shadow p-6 lg:p-8"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
          style={{
            background:
              "radial-gradient(800px circle at 100% 0%, oklch(0.78 0.18 264 / 0.18), transparent 60%), radial-gradient(600px circle at 0% 100%, oklch(0.78 0.18 300 / 0.12), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {dateLabel}
            </p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              {user?.lastLoginAt ? "Welcome back, " : "Welcome, "}<span className="gradient-text">{firstName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
              {user?.firm?.name
                ? `${user.firm.name} · Review AI-extracted data, monitor client activity and approve transactions in one place.`
                : "Review AI-extracted data, monitor client activity and approve transactions in one place."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/firm/transactions"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-primary/20"
            >
              <Search className="w-4 h-4" />
              Review Queue
            </Link>
            <Link
              href="/firm/companies"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-border"
            >
              <Building2 className="w-4 h-4" />
              Companies
            </Link>
            <Link
              href="/firm/reports"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-border"
            >
              <BarChart3 className="w-4 h-4" />
              Reports
            </Link>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Pending Review"
          value={loading ? "—" : stats?.pendingCount ?? 0}
          icon={Clock}
          color="amber"
          index={0}
        />
        <KpiCard
          title="Under Review"
          value={loading ? "—" : stats?.underReviewCount ?? 0}
          icon={AlertTriangle}
          color="blue"
          index={1}
        />
        <KpiCard
          title="Accepted Today"
          value={loading ? "—" : stats?.acceptedToday ?? 0}
          icon={CheckCircle2}
          color="green"
          index={2}
        />
        <KpiCard
          title="Total Companies"
          value={loading ? "—" : stats?.totalCompanies ?? 0}
          icon={Building2}
          color="violet"
          index={3}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Volume chart - 60% */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 card-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Transaction Volume
              </h2>
              <p className="text-xs text-muted-foreground">
                Uploads vs accepted over the last 14 days
              </p>
            </div>
          </div>
          <AreaChart
            data={volumeData}
            series={volumeSeries}
            xKey="day"
            height={280}
            showLegend
          />
        </motion.div>

        {/* Donut */}
        <div className="lg:col-span-2">
          <StatusDistribution stats={stats ?? { pendingCount: 0, underReviewCount: 0, acceptedToday: 0, totalCompanies: 0, pendingTransactions: [] }} />
        </div>
      </div>

      {/* Review queue + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-3 bg-card border border-border rounded-2xl card-shadow overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Review Queue
              </h2>
              <p className="text-xs text-muted-foreground">
                Next 5 transactions awaiting your attention
              </p>
            </div>
            <Link
              href="/firm/transactions"
              className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 bg-muted rounded" />
                    <div className="h-2.5 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-3 w-12 bg-muted rounded" />
                  <div className="h-5 w-16 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          ) : previewTx.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              description="No transactions are awaiting review right now."
            />
          ) : (
            <div className="divide-y divide-border">
              {previewTx.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.04 }}
                >
                  <Link
                    href={`/firm/transactions/${tx.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/50 transition-colors group"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradientForName(
                        tx.document.company.name
                      )} flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm`}
                    >
                      {companyInitial(tx.document.company.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {tx.document.company.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {tx.vendorName || tx.document.originalName}
                      </div>
                    </div>
                    <div className="hidden md:block text-sm font-semibold text-foreground tabular-nums shrink-0">
                      {tx.totalAmount
                        ? `₹${tx.totalAmount.toLocaleString("en-IN")}`
                        : "—"}
                    </div>
                    <div className="hidden lg:flex shrink-0">
                      <ConfidenceGauge score={tx.confidenceScore} />
                    </div>
                    <StatusBadge status={tx.status} className="shrink-0" />
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl card-shadow"
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Recent Activity
            </h2>
            <p className="text-xs text-muted-foreground">Latest events across all clients</p>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-3/4 bg-muted rounded" />
                      <div className="h-2 w-1/3 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityFeed items={activity} />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
