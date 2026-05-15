"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileText, Filter, Upload, ChevronRight, Download } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
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
  invoiceNumber?: string;
  totalAmount?: number;
  confidenceScore?: number;
  createdAt: string;
  document: {
    originalName: string;
    documentType: string;
    uploadedAt: string;
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

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 border-b border-border animate-pulse"
        >
          <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-muted rounded w-48" />
            <div className="h-2.5 bg-muted rounded w-32" />
          </div>
          <div className="h-5 w-20 bg-muted rounded-full" />
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground/60 mb-1">
        {filter ? `No ${filter.toLowerCase().replace("_", " ")} transactions` : "No transactions yet"}
      </h3>
      <p className="text-xs text-muted-foreground mb-6 max-w-xs">
        {filter
          ? "Try a different filter to see more results."
          : "Upload your first document to get started."}
      </p>
      {!filter && (
        <Link
          href="/company/upload"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </Link>
      )}
    </div>
  );
}

export default function CompanyTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = activeFilter
      ? `/api/transactions?status=${activeFilter}`
      : "/api/transactions";

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setTransactions(d.transactions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeFilter]);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="My Transactions"
        subtitle="All your uploaded documents and their review status"
        breadcrumb={[{ label: "Dashboard", href: "/company" }, { label: "Transactions" }]}
        action={
          <Link
            href="/company/upload"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Link>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden card-shadow"
      >
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-1" />
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all",
                activeFilter === f.value
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap">
                <Download className="w-3.5 h-3.5" />
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
                    window.open(`/api/transactions/export?${params}`);
                  }}
                >
                  <Download className="w-4 h-4" />
                  Export for Tally
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-border bg-muted/30">
          {["Document", "Type", "Date", "Status", "Amount", ""].map((h) => (
            <div key={h} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <TableSkeleton />
        ) : transactions.length === 0 ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <div>
            {transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-start md:items-center px-5 py-4 border-b border-border hover:bg-accent/50 transition-colors last:border-0"
              >
                {/* Document */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {tx.document.originalName}
                    </div>
                    {tx.vendorName && (
                      <div className="text-xs text-muted-foreground truncate">{tx.vendorName}</div>
                    )}
                  </div>
                </div>

                {/* Type */}
                <div className="text-xs text-muted-foreground">
                  {DOC_TYPE_LABELS[tx.document.documentType] || tx.document.documentType}
                </div>

                {/* Date */}
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(tx.document.uploadedAt), { addSuffix: true })}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={tx.status} />
                </div>

                {/* Amount */}
                <div className="text-sm font-semibold text-foreground">
                  {tx.totalAmount
                    ? `₹${tx.totalAmount.toLocaleString("en-IN")}`
                    : "—"}
                </div>

                {/* Action */}
                <div>
                  <Link
                    href={`/firm/transactions/${tx.id}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
