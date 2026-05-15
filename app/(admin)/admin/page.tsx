"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Building2,
  Users,
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  Globe,
  ChevronRight,
  Power,
  Trash2,
  MoreVertical,
  AlertTriangle,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Firm {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; companies: number };
}

interface PlatformStats {
  totalCompanies: number;
  totalUsers: number;
  totalDocuments: number;
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-muted text-muted-foreground border-border",
  professional: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  enterprise: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  index,
}: {
  icon: typeof Building2;
  label: string;
  value: number | string;
  color: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="bg-card border border-border rounded-2xl p-5 card-shadow"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboard, setShowOnboard] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    firmName: "",
    firmEmail: "",
    firmPhone: "",
    plan: "starter",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [confirmDelete, setConfirmDelete] = useState<Firm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function loadFirms() {
    try {
      const res = await fetch("/api/admin/firms");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setFirms(data.firms);
      setStats(data.stats);
    } catch {
      toast.error("Failed to load firms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFirms(); }, []);

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firmName || !form.firmEmail || !form.adminName || !form.adminEmail || !form.adminPassword) {
      toast.error("All fields are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`${data.firm.name} onboarded with admin ${data.admin.email}`);
      setShowOnboard(false);
      setForm({ firmName: "", firmEmail: "", firmPhone: "", plan: "starter", adminName: "", adminEmail: "", adminPassword: "" });
      await loadFirms();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(firm: Firm) {
    setToggling(firm.id);
    try {
      const res = await fetch(`/api/admin/firms/${firm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !firm.isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(firm.isActive ? `${firm.name} deactivated` : `${firm.name} reactivated`);
      await loadFirms();
    } catch {
      toast.error("Failed to update firm");
    } finally {
      setToggling(null);
    }
  }

  async function handleDeleteFirm() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/firms/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success(`${confirmDelete.name} permanently deleted`);
      setConfirmDelete(null);
      await loadFirms();
    } catch {
      toast.error("Failed to delete firm");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage accounting firms across the FinBridge platform
          </p>
        </div>
        <Button onClick={() => setShowOnboard(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Onboard Firm
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Building2}
          label="Accounting Firms"
          value={loading ? "—" : firms.length}
          color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          index={0}
        />
        <StatCard
          icon={Globe}
          label="Client Companies"
          value={loading ? "—" : (stats?.totalCompanies ?? 0)}
          color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          index={1}
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={loading ? "—" : (stats?.totalUsers ?? 0)}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          index={2}
        />
        <StatCard
          icon={FileText}
          label="Documents Processed"
          value={loading ? "—" : (stats?.totalDocuments ?? 0)}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          index={3}
        />
      </div>

      {/* Firms list */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Accounting Firms</h2>
        <span className="text-xs text-muted-foreground">{firms.length} registered</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 bg-muted rounded" />
                <div className="h-2.5 w-56 bg-muted rounded" />
              </div>
              <div className="h-6 w-20 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : firms.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-2xl">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-medium">No firms onboarded yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Onboard Firm" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {firms.map((firm, i) => (
            <motion.div
              key={firm.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 card-shadow flex items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow">
                {firm.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{firm.name}</p>
                  {!firm.isActive && (
                    <Badge variant="secondary" className="text-[10px] h-4">Inactive</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{firm.email}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {firm._count.users} users
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {firm._count.companies} companies
                  </span>
                  <span>{format(new Date(firm.createdAt), "MMM d, yyyy")}</span>
                </div>
                <Badge className={cn("text-xs border capitalize", PLAN_COLORS[firm.plan] ?? PLAN_COLORS.starter)}>
                  {firm.plan}
                </Badge>
                {firm.isActive ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Power className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleToggleActive(firm)}
                      disabled={toggling === firm.id}
                    >
                      <Power className="w-4 h-4 mr-2" />
                      {firm.isActive ? "Deactivate" : "Reactivate"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setConfirmDelete(firm)}
                      className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Delete Firm
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong className="text-foreground">{confirmDelete?.name}</strong> along
              with all its users ({confirmDelete?._count.users}), companies ({confirmDelete?._count.companies}),
              and associated documents. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteFirm}
              disabled={deleting}
              className="gap-2"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboard Dialog */}
      <Dialog open={showOnboard} onOpenChange={setShowOnboard}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Onboard Accounting Firm</DialogTitle>
            <DialogDescription>
              Register a new accounting firm and create their admin account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOnboard} className="space-y-4 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Firm Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Firm Name *</Label>
                <Input
                  value={form.firmName}
                  onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))}
                  placeholder="Sharma & Associates"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Firm Email *</Label>
                <Input
                  type="email"
                  value={form.firmEmail}
                  onChange={(e) => setForm((f) => ({ ...f, firmEmail: e.target.value }))}
                  placeholder="contact@firm.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.firmPhone}
                  onChange={(e) => setForm((f) => ({ ...f, firmPhone: e.target.value }))}
                  placeholder="+91 99999 00000"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Plan</Label>
                <Select
                  value={form.plan}
                  onValueChange={(v) => setForm((f) => ({ ...f, plan: v ?? "starter" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Firm Admin Account</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Admin Name *</Label>
                <Input
                  value={form.adminName}
                  onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                  placeholder="Rajesh Sharma"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Admin Email *</Label>
                <Input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                  placeholder="admin@firm.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {creating ? "Onboarding…" : "Onboard Firm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
