"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Filter,
  Loader2,
  Mail,
  Building2,
  UserCheck,
  UserX,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  approvalStatus: string;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  firmId: string | null;
  companyId: string | null;
  firm: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  FIRM_ADMIN: "Firm Admin",
  FIRM_ACCOUNTANT: "Firm Accountant",
  COMPANY_ADMIN: "Company Admin",
  COMPANY_USER: "Company User",
};

const ROLE_COLORS: Record<string, string> = {
  PLATFORM_ADMIN: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  FIRM_ADMIN: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  FIRM_ACCOUNTANT: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  COMPANY_ADMIN: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  COMPANY_USER: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
};

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const ASSIGNABLE_ROLES = [
  { label: "Company User", value: "COMPANY_USER" },
  { label: "Company Admin", value: "COMPANY_ADMIN" },
  { label: "Firm Accountant", value: "FIRM_ACCOUNTANT" },
  { label: "Firm Admin", value: "FIRM_ADMIN" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING_APPROVAL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/admin/users?approvalStatus=${filter}`
        : "/api/admin/users";
      const res = await fetch(url);
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleApproval(
    userId: string,
    action: "APPROVED" | "REJECTED",
    role?: string
  ) {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(
        action === "APPROVED"
          ? `User approved successfully`
          : "User rejected"
      );
      fetchUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteUser() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: confirmDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`${confirmDelete.name} deleted permanently`);
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  const pendingCount = users.filter(
    (u) => u.approvalStatus === "PENDING_APPROVAL"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approve or reject user access requests
          </p>
        </div>
        {pendingCount > 0 && filter !== "PENDING_APPROVAL" && (
          <button
            onClick={() => setFilter("PENDING_APPROVAL")}
            className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg"
          >
            <Clock className="w-4 h-4" />
            {pendingCount} pending
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
              filter === f.value
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Users list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden card-shadow"
      >
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-40 bg-muted rounded" />
                  <div className="h-2.5 w-28 bg-muted rounded" />
                </div>
                <div className="h-8 w-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              No users found
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              {filter === "PENDING_APPROVAL"
                ? "No users are currently waiting for approval."
                : "No users match this filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col md:flex-row md:items-center gap-4 px-5 py-4"
              >
                {/* User info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                </div>

                {/* Role badge */}
                <div
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded-lg border shrink-0",
                    ROLE_COLORS[user.role] || "bg-muted text-muted-foreground"
                  )}
                >
                  {ROLE_LABELS[user.role] || user.role}
                </div>

                {/* Org info */}
                {(user.firm || user.company) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Building2 className="w-3 h-3" />
                    <span>
                      {user.firm?.name}
                      {user.company ? ` / ${user.company.name}` : ""}
                    </span>
                  </div>
                )}

                {/* Status & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {user.approvalStatus === "PENDING_APPROVAL" ? (
                    <>
                      {/* Role selector for approval */}
                      <select
                        id={`role-${user.id}`}
                        defaultValue={user.role}
                        className="text-xs bg-background border border-input rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          const select = document.getElementById(
                            `role-${user.id}`
                          ) as HTMLSelectElement;
                          handleApproval(
                            user.id,
                            "APPROVED",
                            select?.value || user.role
                          );
                        }}
                        disabled={actionLoading === user.id}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        Approve
                      </button>

                      <button
                        onClick={() => handleApproval(user.id, "REJECTED")}
                        disabled={actionLoading === user.id}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-3 h-3" />
                        Reject
                      </button>
                    </>
                  ) : user.approvalStatus === "APPROVED" ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      <XCircle className="w-3.5 h-3.5" />
                      Rejected
                    </span>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => setConfirmDelete(user)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <strong className="text-foreground">{confirmDelete?.name}</strong>{" "}
              ({confirmDelete?.email}). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <DialogClose className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer">
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
