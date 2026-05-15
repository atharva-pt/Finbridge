"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  BarChart3,
  Upload,
  FileText,
  Download,
  Loader2,
  Search,
  Plus,
  File,
  FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Company {
  id: string;
  name: string;
}

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

export default function FirmReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadForm, setUploadForm] = useState({
    companyId: "",
    title: "",
    reportType: "MIS",
    period: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function loadReports() {
    const params = filterCompany !== "all" ? `?companyId=${filterCompany}` : "";
    const res = await fetch(`/api/reports${params}`);
    if (res.ok) {
      const d = await res.json();
      setReports(d.reports ?? []);
    }
  }

  async function loadCompanies() {
    const res = await fetch("/api/firm/companies");
    if (res.ok) {
      const d = await res.json();
      setCompanies(d.companies ?? []);
    }
  }

  useEffect(() => {
    Promise.all([loadReports(), loadCompanies()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCompany]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !uploadForm.companyId || !uploadForm.title) {
      toast.error("Please fill in all required fields and select a file");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("companyId", uploadForm.companyId);
      fd.append("title", uploadForm.title);
      fd.append("reportType", uploadForm.reportType);
      if (uploadForm.period) fd.append("period", uploadForm.period);

      const res = await fetch("/api/reports", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success("Report uploaded successfully");
      setShowUpload(false);
      setSelectedFile(null);
      setUploadForm({ companyId: "", title: "", reportType: "MIS", period: "" });
      await loadReports();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const filtered = reports.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.company.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.period?.toLowerCase() ?? "").includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Reports"
        subtitle="Upload and manage financial reports for your client companies"
        action={
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Report
          </Button>
        }
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
        <Select value={filterCompany} onValueChange={(v) => setFilterCompany(v ?? "all")}>
          <SelectTrigger className="w-[180px] text-sm">
            <SelectValue placeholder="All companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 bg-muted rounded" />
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
            {search || filterCompany !== "all" ? "No reports match your filters" : "No reports yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload MIS reports, balance sheets, and more for your clients
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
                  <p className="text-sm font-semibold text-foreground truncate">{report.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-xs text-muted-foreground">{report.company.name}</p>
                    {report.period && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <p className="text-xs text-muted-foreground">{report.period}</p>
                      </>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <p className="text-xs text-muted-foreground">{formatBytes(report.fileSize)}</p>
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

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Report</DialogTitle>
            <DialogDescription>
              Upload a financial report (PDF, Excel, Word, CSV) for a client company.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Company *</Label>
              <Select
                value={uploadForm.companyId}
                onValueChange={(v) => setUploadForm((f) => ({ ...f, companyId: v ?? "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Report Title *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Q1 FY2025 MIS Report"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={uploadForm.reportType}
                  onValueChange={(v) => setUploadForm((f) => ({ ...f, reportType: v ?? "MIS" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Period</Label>
                <Input
                  value={uploadForm.period}
                  onChange={(e) => setUploadForm((f) => ({ ...f, period: e.target.value }))}
                  placeholder="Q1 FY2025"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>File *</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors",
                  selectedFile
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-accent"
                )}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.xls,.xlsx,.doc,.docx,.csv,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-2 justify-center">
                    <File className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">({formatBytes(selectedFile.size)})</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground/50 mx-auto mb-1.5" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a file
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">PDF, Excel, Word, CSV — max 20MB</p>
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={uploading} className="gap-2">
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? "Uploading…" : "Upload Report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
