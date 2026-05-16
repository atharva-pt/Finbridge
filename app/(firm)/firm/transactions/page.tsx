"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfidenceGauge } from "@/components/dashboard/confidence-gauge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FileText, Search, ChevronRight, Download, Brain } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { SmartSearch } from "@/components/ai/smart-search";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Transaction {
  id: string;
  status: string;
  vendorName?: string;
  totalAmount?: number;
  confidenceScore?: number;
  createdAt: string;
  updatedAt?: string;
  document: {
    originalName: string;
    documentType: string;
    uploadedAt: string;
    company: { name: string; slug: string };
  };
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Accepted", value: "ACCEPTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Needs Info", value: "NEEDS_INFO" },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  INVOICE: "Invoice",
  RECEIPT: "Receipt",
  BANK_STATEMENT: "Bank Stmt",
  SALARY_REGISTER: "Salary Reg",
  LEDGER: "Ledger",
  OTHER: "Other",
};

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

function TableSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-48 bg-muted rounded" />
            <div className="h-2.5 w-32 bg-muted rounded" />
          </div>
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-5 w-20 bg-muted rounded-full" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

export default function FirmTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [search, setSearch] = useState("");
  const [aiSearch, setAiSearch] = useState(false);
  const [aiResults, setAiResults] = useState<Transaction[] | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeFilter) params.set("status", activeFilter);

    fetch(`/api/transactions?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTransactions(d.transactions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeFilter]);

  const filtered = useMemo(() => {
    // If AI search is active and has results, use those
    if (aiSearch && aiResults) return aiResults;
    if (!search) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.document.originalName.toLowerCase().includes(q) ||
        tx.document.company?.name?.toLowerCase().includes(q) ||
        tx.vendorName?.toLowerCase().includes(q)
    );
  }, [transactions, search, aiSearch, aiResults]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tx of transactions) counts[tx.status] = (counts[tx.status] ?? 0) + 1;
    return counts;
  }, [transactions]);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Review Queue"
        subtitle="AI-extracted financial data ready for your approval"
        breadcrumb={[{ label: "Dashboard", href: "/firm" }, { label: "Transactions" }]}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl card-shadow overflow-hidden"
      >
        {/* Sticky search + filter bar */}
        <div className="sticky top-14 z-10 bg-card/95 backdrop-blur border-b border-border">
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                {aiSearch ? (
                  <SmartSearch
                    items={transactions.map((tx) => ({
                      ...tx,
                      text: [tx.vendorName, tx.document.company.name, tx.document.originalName, tx.document.documentType].filter(Boolean).join(" "),
                    }))}
                    onResults={(results) => setAiResults(results as unknown as Transaction[])}
                    onClear={() => setAiResults(null)}
                    placeholder="AI search — try 'software subscriptions' or 'large invoices'"
                  />
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by company, vendor, or document name…"
                      className="w-full bg-muted/50 border border-border hover:border-foreground/20 focus:border-primary focus:ring-2 focus:ring-primary/15 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder-muted-foreground outline-none transition-all"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => { setAiSearch(!aiSearch); setAiResults(null); setSearch(""); }}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl border transition-all whitespace-nowrap",
                  aiSearch
                    ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Brain className="w-3.5 h-3.5" />
                AI Search
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap">
                  <Download className="w-4 h-4" />
                  Export
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Export format</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("format", "csv");
                      if (activeFilter) params.set("status", activeFilter);
                      if (search) params.set("search", search);
                      window.open(`/api/transactions/export?${params}`);
                    }}
                  >
                    <FileText className="w-4 h-4" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("format", "tally");
                      if (activeFilter) params.set("status", activeFilter);
                      if (search) params.set("search", search);
                      window.open(`/api/transactions/export?${params}`);
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Export for Tally
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((f) => {
                const active = activeFilter === f.value;
                const count = f.value ? statusCounts[f.value] : transactions.length;
                return (
                  <button
                    key={f.value}
                    onClick={() => setActiveFilter(f.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {f.label}
                    {!loading && (
                      <span
                        className={cn(
                          "tabular-nums text-[10px] px-1.5 py-0.5 rounded-md",
                          active
                            ? "bg-primary-foreground/15 text-primary-foreground/90"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {count ?? 0}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="hidden lg:grid grid-cols-[2.6fr_1fr_1.1fr_1.2fr_1fr_1fr_0.4fr] gap-4 px-5 py-2.5 border-b border-border bg-muted/30">
          {["Company / Vendor", "Type", "Amount", "Confidence", "Status", "Updated", ""].map(
            (h) => (
              <div
                key={h}
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
              >
                {h}
              </div>
            )
          )}
        </div>

        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No transactions found"
            description={
              search
                ? "Try a different search query or clear filters."
                : "There's nothing in this view right now."
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
              >
                <Link
                  href={`/firm/transactions/${tx.id}`}
                  className="group grid grid-cols-1 lg:grid-cols-[2.6fr_1fr_1.1fr_1.2fr_1fr_1fr_0.4fr] gap-3 lg:gap-4 items-center px-5 py-3.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm",
                        gradientForName(tx.document.company?.name ?? "Unknown")
                      )}
                    >
                      {companyInitial(tx.document.company?.name ?? "?")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {tx.document.company?.name ?? "Unknown Company"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {tx.vendorName ?? tx.document.originalName}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {DOC_TYPE_LABELS[tx.document.documentType] ?? tx.document.documentType}
                  </div>

                  <div className="text-sm font-semibold text-foreground tabular-nums text-left">
                    {tx.totalAmount
                      ? `₹${tx.totalAmount.toLocaleString("en-IN")}`
                      : "—"}
                  </div>

                  <ConfidenceGauge score={tx.confidenceScore} />

                  <StatusBadge status={tx.status} />

                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatDistanceToNow(
                      new Date(tx.updatedAt ?? tx.document.uploadedAt ?? tx.createdAt),
                      { addSuffix: true }
                    )}
                  </div>

                  <div className="flex justify-end">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
