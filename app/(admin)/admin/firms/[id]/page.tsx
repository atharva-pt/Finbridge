"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Building2,
  Users,
  FileText,
  ArrowLeftRight,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/page-header";

/* ---------- types ---------- */

interface FirmDetail {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  logoUrl: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
}

interface CompanyRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  _count: { documents: number };
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  approvalStatus: string;
  createdAt: string;
}

interface TransactionStats {
  PENDING: number;
  UNDER_REVIEW: number;
  ACCEPTED: number;
  REJECTED: number;
  NEEDS_INFO: number;
  total: number;
}

interface FirmData {
  firm: FirmDetail;
  companies: CompanyRow[];
  users: UserRow[];
  counts: { companies: number; users: number; documents: number };
  transactionStats: TransactionStats;
}

/* ---------- constants ---------- */

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-muted text-muted-foreground border-border",
  professional: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  enterprise: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  FIRM_ADMIN: "Firm Admin",
  FIRM_ACCOUNTANT: "Accountant",
  COMPANY_ADMIN: "Company Admin",
  COMPANY_USER: "Company User",
};

const APPROVAL_LABELS: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Approved", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  PENDING_APPROVAL: { label: "Pending", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  REJECTED: { label: "Rejected", className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
};

/* ---------- loading skeleton ---------- */

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* breadcrumb placeholder */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* firm info card */}
      <Skeleton className="h-44 w-full rounded-2xl" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      {/* table skeletons */}
      <Skeleton className="h-60 w-full rounded-2xl" />
      <Skeleton className="h-60 w-full rounded-2xl" />
    </div>
  );
}

/* ---------- page ---------- */

export default function FirmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<FirmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/firms/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Failed to load firm");
        }
        const json: FirmData = await res.json();
        setData(json);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load firm";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-0">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <XCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm font-medium text-foreground">Failed to load firm</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Link href="/admin" className="text-xs text-primary hover:underline mt-4">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const { firm, companies, users, counts, transactionStats } = data;

  return (
    <div>
      {/* Page Header with Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeader
          title={firm.name}
          subtitle={`Slug: ${firm.slug} — Plan: ${firm.plan}`}
          breadcrumb={[
            { label: "Admin Dashboard", href: "/admin" },
            { label: "Firms", href: "/admin" },
            { label: firm.name },
          ]}
        />
      </motion.div>

      {/* Firm Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="bg-card border border-border rounded-2xl p-6 mb-8"
      >
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow">
            {firm.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">{firm.name}</h2>
              {firm.isActive ? (
                <Badge variant="secondary" className="text-[10px] h-5 gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>
              )}
              <Badge className={`text-xs border capitalize ${PLAN_COLORS[firm.plan] ?? PLAN_COLORS.starter}`}>
                {firm.plan}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 mt-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{firm.email}</span>
              </div>
              {firm.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{firm.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Created {format(new Date(firm.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Building2}
          label="Total Companies"
          value={counts.companies}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10 border-blue-500/20"
          index={0}
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={counts.users}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          index={1}
        />
        <StatCard
          icon={FileText}
          label="Total Documents"
          value={counts.documents}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10 border-amber-500/20"
          index={2}
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Total Transactions"
          value={transactionStats.total}
          iconColor="text-violet-500"
          iconBg="bg-violet-500/10 border-violet-500/20"
          index={3}
        />
      </div>

      {/* Transaction Status Breakdown */}
      {transactionStats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="flex flex-wrap items-center gap-3 mb-8"
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transaction Status:</span>
          {(["PENDING", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "NEEDS_INFO"] as const).map(
            (s) =>
              transactionStats[s] > 0 && (
                <StatusBadge key={s} status={s} className="text-xs" />
              )
          )}
        </motion.div>
      )}

      {/* Companies Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Companies</h2>
          <span className="text-xs text-muted-foreground">{companies.length} total</span>
        </div>

        {companies.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No companies yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr
                      key={company.id}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium text-foreground">{company.name}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{company.email}</td>
                      <td className="px-5 py-3.5">
                        {company.isActive ? (
                          <Badge variant="secondary" className="text-[10px] h-5 gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">
                        {company._count.documents}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Users</h2>
          <span className="text-xs text-muted-foreground">{users.length} total</span>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No users yet</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const approval = APPROVAL_LABELS[user.approvalStatus] ?? {
                      label: user.approvalStatus,
                      className: "bg-muted text-muted-foreground border-border",
                    };
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-medium text-foreground">{user.name}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{user.email}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {ROLE_LABELS[user.role] ?? user.role}
                        </td>
                        <td className="px-5 py-3.5">
                          {user.isActive ? (
                            <Badge variant="secondary" className="text-[10px] h-5 gap-1 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="secondary" className={`text-[10px] h-5 border ${approval.className}`}>
                            {approval.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
