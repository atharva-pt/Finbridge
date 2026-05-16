"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { ConfidenceGauge } from "@/components/dashboard/confidence-gauge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { AiInsights } from "@/components/dashboard/ai-insights";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

interface Stats {
  totalDocuments: number;
  totalTransactions: number;
  pendingReview: number;
  accepted: number;
  rejected: number;
  needsInfo: number;
  recentActivity: Array<{
    id: string;
    documentId?: string;
    vendorName?: string;
    status: string;
    totalAmount?: number;
    confidenceScore?: number;
    createdAt: string;
    document: { originalName: string; documentType: string };
  }>;
  monthlySpending?: Array<{ month: string; amount: number }>;
  topVendors?: Array<{ vendor: string; amount: number }>;
}

interface MeUser {
  id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  company?: { name: string } | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Invoice",
  RECEIPT: "Receipt",
  BANK_STATEMENT: "Bank Statement",
  SALARY_REGISTER: "Salary Register",
  LEDGER: "Ledger",
  OTHER: "Other",
};


interface BarTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: BarTooltipPayloadItem[];
  label?: string | number;
}

function BarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur px-3 py-2 text-xs card-shadow">
      <div className="font-semibold text-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-muted-foreground">Accepted:</span>
        <span className="font-semibold text-foreground tabular-nums">
          ₹{typeof value === "number" ? value.toLocaleString("en-IN") : value}
        </span>
      </div>
    </div>
  );
}

export default function CompanyDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/company/stats").then((r) => r.json()),
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

  const spendingData = stats?.monthlySpending ?? [];

  const topVendors = stats?.topVendors ?? [];

  const maxVendor = topVendors.reduce((m, v) => Math.max(m, v.amount), 0) || 1;

  const recent = stats?.recentActivity ?? [];
  const dateLabel = format(new Date(), "EEEE, MMM d");

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
              "radial-gradient(800px circle at 100% 0%, oklch(0.78 0.18 264 / 0.18), transparent 60%), radial-gradient(600px circle at 0% 100%, oklch(0.78 0.18 180 / 0.10), transparent 50%)",
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
              {user?.company?.name
                ? `${user.company.name} · Upload financial documents and track AI-powered extraction in real time.`
                : "Upload financial documents and track AI-powered extraction in real time."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/company/upload"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-primary/20"
            >
              <Upload className="w-4 h-4" />
              Upload Documents
            </Link>
            <Link
              href="/company/transactions"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors border border-border"
            >
              <FileText className="w-4 h-4" />
              View Transactions
            </Link>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Transactions"
          value={loading ? "—" : stats?.totalTransactions ?? 0}
          icon={FileText}
          color="indigo"
          index={0}
        />
        <KpiCard
          title="Pending / In Review"
          value={loading ? "—" : stats?.pendingReview ?? 0}
          icon={Clock}
          color="amber"
          index={1}
        />
        <KpiCard
          title="Accepted"
          value={loading ? "—" : stats?.accepted ?? 0}
          icon={CheckCircle2}
          color="green"
          index={2}
        />
        <KpiCard
          title="Needs Info"
          value={loading ? "—" : stats?.needsInfo ?? 0}
          icon={AlertTriangle}
          color="amber"
          index={3}
        />
        <KpiCard
          title="Rejected"
          value={loading ? "—" : stats?.rejected ?? 0}
          icon={XCircle}
          color="red"
          index={4}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Spending Trends */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 card-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Spending Trends
              </h2>
              <p className="text-xs text-muted-foreground">
                Accepted transaction amounts · last 6 months
              </p>
            </div>
          </div>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tickFormatter={(v: number) =>
                    v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${v / 1000}k`
                  }
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={<BarTooltip />}
                />
                <Bar
                  dataKey="amount"
                  fill="url(#bar-gradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={56}
                >
                  {spendingData.map((_, i) => (
                    <Cell key={i} fill="url(#bar-gradient)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Vendors */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 card-shadow"
        >
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Top Expense Categories
            </h2>
            <p className="text-xs text-muted-foreground">Highest-spend vendors</p>
          </div>
          <div className="mt-4 space-y-3">
            {topVendors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-muted-foreground">
                  No expense data yet. Upload documents to see vendor analytics.
                </p>
              </div>
            )}
            {topVendors.map((v, i) => {
              const pct = (v.amount / maxVendor) * 100;
              return (
                <motion.div
                  key={v.vendor}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate">
                        {v.vendor}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums shrink-0">
                      ₹{v.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.35 + i * 0.05, ease: "easeOut" }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* AI Insights */}
      <AiInsights />

      {/* Recent documents table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-card border border-border rounded-2xl card-shadow overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              Recent Documents
            </h2>
            <p className="text-xs text-muted-foreground">Last 10 uploaded</p>
          </div>
          <Link
            href="/company/transactions"
            className="text-xs font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Table header */}
        <div className="hidden lg:grid grid-cols-[2.2fr_1fr_1.1fr_1.1fr_1fr_0.9fr] gap-4 px-5 py-2.5 border-b border-border bg-muted/30">
          {["Document", "Type", "Amount", "Confidence", "Status", "Date"].map((h) => (
            <div
              key={h}
              className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 animate-pulse"
              >
                <div className="w-9 h-9 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-44 bg-muted rounded" />
                  <div className="h-2.5 w-28 bg-muted rounded" />
                </div>
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-5 w-20 bg-muted rounded-full" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No documents yet"
            description="Upload your first invoice or receipt to see AI-powered extraction in action."
            action={{
              label: "Upload Document",
              href: "/company/upload",
              icon: Upload,
            }}
          />
        ) : (
          <div className="divide-y divide-border">
            {recent.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.03 }}
                className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr_1.1fr_1.1fr_1fr_0.9fr] gap-3 lg:gap-4 items-center px-5 py-3.5 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {tx.document.originalName}
                    </div>
                    {tx.vendorName && (
                      <div className="text-xs text-muted-foreground truncate">
                        {tx.vendorName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {DOC_TYPE_LABELS[tx.document.documentType] ?? tx.document.documentType}
                </div>
                <div className="text-sm font-semibold text-foreground tabular-nums">
                  {tx.totalAmount ? `₹${tx.totalAmount.toLocaleString("en-IN")}` : "—"}
                </div>
                <ConfidenceGauge score={tx.confidenceScore} />
                <StatusBadge status={tx.status} />
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
