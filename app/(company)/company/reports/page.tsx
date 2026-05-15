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
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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

const REPORT_TYPES = ["all", ...Object.keys(REPORT_TYPE_LABELS)];

export default function CompanyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports ?? []))
      .finally(() => setLoading(false));
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
      />

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
