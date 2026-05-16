"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  BarChart3,
  FileText,
  Download,
  Search,
  FileSpreadsheet,
  IndianRupee,
  CheckCircle2,
  Clock,
  Hash,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  title: string;
  reportType: string;
  period?: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  company: { id: string; name: string; slug: string };
  uploadedBy?: { name: string; email: string } | null;
}

interface ReportSummary {
  totalTransactions: number;
  totalAmount: number;
  totalTax: number;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
  byDocType: Array<{ type: string; count: number; amount: number }>;
  byMonth: Array<{ month: string; count: number; amount: number }>;
  topVendors: Array<{ vendor: string; count: number; amount: number }>;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  MIS: "MIS Report",
  BALANCE_SHEET: "Balance Sheet",
  PROFIT_LOSS: "P&L Statement",
  CASH_FLOW: "Cash Flow",
  TAX: "Tax Report",
  AUDIT: "Audit Report",
  CUSTOM: "Custom",
};

const TYPE_COLORS: Record<string, string> = {
  MIS: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  BALANCE_SHEET: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  PROFIT_LOSS: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  CASH_FLOW: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  TAX: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  AUDIT: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  CUSTOM: "bg-muted text-muted-foreground border-border",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Invoice",
  RECEIPT: "Receipt",
  BANK_STATEMENT: "Bank Statement",
  SALARY_REGISTER: "Salary Register",
  LEDGER: "Ledger",
  OTHER: "Other",
};

function fileIcon(mimeType: string) {
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return FileSpreadsheet;
  return FileText;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrency(amount: number) {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
  return amount.toLocaleString("en-IN");
}

const REPORT_TYPES = ["all", ...Object.keys(REPORT_TYPE_LABELS)];

export default function CompanyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  async function loadSummary() {
    try {
      const res = await fetch("/api/company/reports/summary");
      if (res.ok) {
        const d = await res.json();
        setSummary(d);
      }
    } catch {
      // Silently fail — summary is non-critical
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/reports")
        .then((r) => r.json())
        .then((d) => setReports(d.reports ?? [])),
      loadSummary(),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = reports.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.period?.toLowerCase() ?? "").includes(search.toLowerCase());
    const matchType = filterType === "all" || r.reportType === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Reports"
        subtitle="Financial reports shared by your accounting firm"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.open("/api/reports/export-csv?period=last30")}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download CSV Report
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("/company/reports/generate?period=last30", "_blank")}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Generate PDF Report
            </Button>
          </div>
        }
      />

      {/* Financial Summary Dashboard */}
      {summaryLoading ? (
        <div className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-5 animate-pulse"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-muted" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
                <div className="h-8 w-24 bg-muted rounded" />
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 animate-pulse h-64" />
        </div>
      ) : summary && summary.totalTransactions > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-foreground">Financial Summary</h2>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Total Transactions"
              value={summary.totalTransactions.toLocaleString("en-IN")}
              icon={Hash}
              color="indigo"
              index={0}
            />
            <KpiCard
              title="Total Amount"
              value={`₹${formatCurrency(summary.totalAmount)}`}
              icon={IndianRupee}
              color="violet"
              index={1}
            />
            <KpiCard
              title="Accepted"
              value={summary.acceptedCount.toLocaleString("en-IN")}
              icon={CheckCircle2}
              color="green"
              index={2}
            />
            <KpiCard
              title="Pending"
              value={summary.pendingCount.toLocaleString("en-IN")}
              icon={Clock}
              color="amber"
              index={3}
            />
          </div>

          {/* Monthly Spending Chart */}
          {summary.byMonth.some((m) => m.amount > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-6 card-shadow mb-6"
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Spending</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byMonth} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      tickFormatter={(v) => `₹${formatCurrency(v)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--card)",
                        fontSize: "13px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Amount"]) as any}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* By Document Type Table */}
            {summary.byDocType.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="bg-card border border-border rounded-2xl p-6 card-shadow"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-violet-500" />
                  <h3 className="text-sm font-semibold text-foreground">By Document Type</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-1 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground">Count</th>
                        <th className="text-right py-2 px-1 text-xs font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.byDocType.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2 px-1 font-medium text-foreground">{DOC_TYPE_LABELS[row.type] ?? row.type}</td>
                          <td className="py-2 px-1 text-right tabular-nums text-muted-foreground">{row.count}</td>
                          <td className="py-2 px-1 text-right tabular-nums text-foreground">₹{formatCurrency(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Top Vendors */}
            {summary.topVendors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="bg-card border border-border rounded-2xl p-6 card-shadow"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-semibold text-foreground">Top 5 Vendors</h3>
                </div>
                <div className="space-y-3">
                  {summary.topVendors.map((v, i) => {
                    const maxAmount = summary.topVendors[0]?.amount ?? 1;
                    const pct = Math.round((v.amount / maxAmount) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">{v.vendor}</span>
                          <span className="text-sm tabular-nums text-foreground">₹{formatCurrency(v.amount)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-violet-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{v.count} transactions</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : !summaryLoading && summary?.totalTransactions === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border rounded-2xl p-8 text-center mb-10"
        >
          <BarChart3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No transaction data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Financial summaries will appear here once documents are uploaded and processed.
          </p>
        </motion.div>
      ) : null}

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Reports</h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search reports…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {REPORT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                filterType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {t === "all" ? "All" : REPORT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-44 bg-muted rounded" />
                <div className="h-2.5 w-28 bg-muted rounded" />
              </div>
              <div className="h-6 w-24 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-medium">
            {search || filterType !== "all" ? "No reports match your filters" : "No reports yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search || filterType !== "all"
              ? "Try adjusting your filters"
              : "Your accounting firm will share reports here once they're ready"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report, i) => {
            const Icon = fileIcon(report.mimeType);
            const typeColor = TYPE_COLORS[report.reportType] ?? TYPE_COLORS.CUSTOM;
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="bg-card border border-border rounded-2xl p-4 card-shadow flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{report.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {report.period && (
                      <p className="text-xs text-muted-foreground">{report.period}</p>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <p className="text-xs text-muted-foreground">{formatBytes(report.fileSize)}</p>
                    {report.uploadedBy && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <p className="text-xs text-muted-foreground">by {report.uploadedBy.name}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={cn("text-xs border", typeColor)}>
                    {REPORT_TYPE_LABELS[report.reportType] ?? report.reportType}
                  </Badge>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {format(new Date(report.uploadedAt), "MMM d, yyyy")}
                  </p>
                  <a
                    href={`/api/reports/${report.id}/download`}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
