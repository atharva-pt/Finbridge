"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ScrollText,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userId: string | null;
  user: AuditUser | null;
}

const ACTION_FILTERS = [
  { label: "All", value: "" },
  { label: "Firm Onboarded", value: "FIRM_ONBOARDED" },
  { label: "Firm Deleted", value: "FIRM_DELETED" },
  { label: "User Approved", value: "USER_APPROVED" },
  { label: "User Rejected", value: "USER_REJECTED" },
  { label: "Doc Uploaded", value: "DOCUMENT_UPLOADED" },
  { label: "Txn Created", value: "TRANSACTION_CREATED" },
];

function getActionColor(action: string) {
  if (["FIRM_ONBOARDED", "USER_APPROVED"].includes(action)) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (["FIRM_DELETED", "USER_REJECTED"].includes(action)) {
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  }
  if (["DOCUMENT_UPLOADED", "TRANSACTION_CREATED"].includes(action)) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }
  return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
}

function formatAction(action: string) {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (action) params.set("action", action);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load audit logs");
        return;
      }
      setLogs(data.logs ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [action]);

  const filteredLogs = search
    ? logs.filter(
        (log) =>
          log.user?.name.toLowerCase().includes(search.toLowerCase()) ||
          log.user?.email.toLowerCase().includes(search.toLowerCase()) ||
          log.description.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-primary" />
          Audit Trail
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all platform activity and changes
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
          {ACTION_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setAction(f.value)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
                action === f.value
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by user or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-3 py-1.5 text-xs rounded-lg bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Audit log list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden card-shadow"
      >
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 animate-pulse"
              >
                <div className="w-9 h-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-48 bg-muted rounded" />
                  <div className="h-2.5 w-32 bg-muted rounded" />
                </div>
                <div className="h-6 w-24 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ScrollText className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              No audit logs found
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              {action
                ? "No logs match this filter. Try a different action type."
                : "No activity has been recorded yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLogs.map((log, i) => {
              const initials = log.user
                ? log.user.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : "?";

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">
                      <span className="font-medium">
                        {log.user?.name ?? "System"}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {log.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                      {log.user?.email && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="truncate">{log.user.email}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action badge */}
                  <span
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0",
                      getActionColor(log.action)
                    )}
                  >
                    {formatAction(log.action)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
