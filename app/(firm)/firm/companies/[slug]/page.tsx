"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  IndianRupee,
  Users,
  Shield,
  Hash,
  CalendarDays,
  Loader2,
  AlertCircle,
  Receipt,
  Landmark,
  BookOpen,
  FileSpreadsheet,
  File,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  industry: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
}

interface TransactionDoc {
  id: string;
  documentType: string;
  originalName: string;
}

interface RecentTransaction {
  id: string;
  vendorName: string | null;
  amount: number | null;
  totalAmount: number | null;
  status: string;
  createdAt: string;
  invoiceDate: string | null;
  document: TransactionDoc;
}

interface CompanyDetail {
  company: CompanyInfo;
  users: CompanyUser[];
  usersCount: number;
  documentsCount: number;
  documentsByStatus: Record<string, number>;
  documentsByType: Record<string, number>;
  recentTransactions: RecentTransaction[];
  totalSpending: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
];

function gradientForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function companyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const DOC_TYPE_LABELS: Record<string, { label: string; icon: typeof FileText }> = {
  INVOICE: { label: "Invoices", icon: FileText },
  RECEIPT: { label: "Receipts", icon: Receipt },
  BANK_STATEMENT: { label: "Bank Statements", icon: Landmark },
  SALARY_REGISTER: { label: "Salary Registers", icon: FileSpreadsheet },
  LEDGER: { label: "Ledgers", icon: BookOpen },
  OTHER: { label: "Other", icon: File },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  NEEDS_INFO: "Needs Info",
};

const ROLE_COLORS: Record<string, string> = {
  COMPANY_ADMIN: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300",
  COMPANY_USER: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300",
  FIRM_ADMIN: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-300",
  FIRM_ACCOUNTANT: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
};

function roleBadgeLabel(role: string) {
  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Active tab state                                                   */
/* ------------------------------------------------------------------ */

type Tab = "transactions" | "documents" | "users";

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CompanyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("transactions");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/firm/companies/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load company");
        }
        return res.json();
      })
      .then((d) => setData(d))
      .catch((err) => {
        setError(err.message);
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 animate-pulse space-y-3">
          <div className="h-3 w-48 bg-muted rounded" />
          <div className="h-7 w-64 bg-muted rounded" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  /* Error state */
  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">{error || "Company not found"}</p>
          <Link href="/firm/companies">
            <Button variant="outline" className="mt-4 gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Companies
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { company, users, usersCount, documentsCount, documentsByStatus, documentsByType, recentTransactions, totalSpending } = data;

  const totalDocs = documentsCount;
  const pendingDocs = (documentsByStatus.PENDING ?? 0) + (documentsByStatus.NEEDS_INFO ?? 0);
  const acceptedDocs = documentsByStatus.ACCEPTED ?? 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: "transactions", label: `Recent Transactions (${recentTransactions.length})` },
    { key: "documents", label: `Documents (${totalDocs})` },
    { key: "users", label: `Users (${usersCount})` },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <PageHeader
        title={company.name}
        subtitle={[company.industry, company.email].filter(Boolean).join(" · ")}
        breadcrumb={[
          { label: "Dashboard", href: "/firm" },
          { label: "Companies", href: "/firm/companies" },
          { label: company.name },
        ]}
        action={
          <Link href="/firm/companies">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        }
      />

      {/* Company info card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card border border-border rounded-2xl p-6 mb-6 card-shadow"
      >
        <div className="flex items-start gap-5">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg",
              gradientForName(company.name)
            )}
          >
            {companyInitials(company.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h2 className="text-lg font-bold text-foreground">{company.name}</h2>
              <Badge
                variant={company.isActive ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  company.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : ""
                )}
              >
                {company.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm">
              {company.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{company.phone}</span>
                </div>
              )}
              {company.gstin && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span>GSTIN: {company.gstin}</span>
                </div>
              )}
              {company.pan && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>PAN: {company.pan}</span>
                </div>
              )}
              {company.industry && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{company.industry}</span>
                </div>
              )}
              {company.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{company.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span>Onboarded {format(new Date(company.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Users className="w-3.5 h-3.5 text-violet-500" />
            {usersCount} User{usersCount !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            {totalDocs} Document{totalDocs !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {recentTransactions.filter((t) => t.status === "ACCEPTED").length} Accepted Transactions
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Total Documents"
          value={totalDocs}
          icon={FileText}
          color="blue"
          index={0}
        />
        <KpiCard
          title="Pending Review"
          value={pendingDocs}
          icon={Clock}
          color="amber"
          index={1}
        />
        <KpiCard
          title="Accepted"
          value={acceptedDocs}
          icon={CheckCircle2}
          color="green"
          index={2}
        />
        <KpiCard
          title="Total Spending"
          value={formatCurrency(totalSpending)}
          icon={IndianRupee}
          color="indigo"
          index={3}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "transactions" && (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <TransactionsSection transactions={recentTransactions} />
          </motion.div>
        )}
        {activeTab === "documents" && (
          <motion.div
            key="documents"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <DocumentsSection
              byStatus={documentsByStatus}
              byType={documentsByType}
              total={totalDocs}
            />
          </motion.div>
        )}
        {activeTab === "users" && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <UsersSection users={users} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-sections                                                       */
/* ------------------------------------------------------------------ */

function TransactionsSection({ transactions }: { transactions: RecentTransaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No transactions yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Transactions will appear here once documents are processed.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vendor</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Document Type</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => (
              <motion.tr
                key={tx.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/firm/transactions/${tx.id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {tx.vendorName || "Unknown Vendor"}
                  </Link>
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-medium">
                  {tx.totalAmount != null
                    ? formatCurrency(tx.totalAmount)
                    : tx.amount != null
                    ? formatCurrency(tx.amount)
                    : "—"}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {DOC_TYPE_LABELS[tx.document.documentType]?.label ?? tx.document.documentType}
                </td>
                <td className="py-3 px-4 text-muted-foreground tabular-nums">
                  {tx.invoiceDate
                    ? format(new Date(tx.invoiceDate), "MMM d, yyyy")
                    : format(new Date(tx.createdAt), "MMM d, yyyy")}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsSection({
  byStatus,
  byType,
  total,
}: {
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No documents uploaded</p>
        <p className="text-xs text-muted-foreground mt-1">
          Documents will appear here once the company uploads them.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* By Type */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">By Document Type</h3>
        <div className="space-y-3">
          {Object.entries(DOC_TYPE_LABELS).map(([key, { label, icon: Icon }]) => {
            const count = byType[key] ?? 0;
            if (count === 0) return null;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                  <span className="text-sm font-medium tabular-nums">{count}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By Status */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">By Status</h3>
        <div className="space-y-3">
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const count = byStatus[key] ?? 0;
            if (count === 0) return null;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const barColors: Record<string, string> = {
              PENDING: "bg-amber-500",
              UNDER_REVIEW: "bg-blue-500",
              ACCEPTED: "bg-emerald-500",
              REJECTED: "bg-red-500",
              NEEDS_INFO: "bg-orange-500",
            };
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium tabular-nums">{count}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn("h-full rounded-full", barColors[key] ?? "bg-gray-500")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UsersSection({ users }: { users: CompanyUser[] }) {
  if (users.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center">
        <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">No users yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Users will appear here once they are added to this company.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
      {users.map((user, i) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userInitials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-2 py-0.5", ROLE_COLORS[user.role] ?? "")}
          >
            {roleBadgeLabel(user.role)}
          </Badge>
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              user.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
            )}
            title={user.isActive ? "Active" : "Inactive"}
          />
        </motion.div>
      ))}
    </div>
  );
}
