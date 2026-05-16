"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
  Building2,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Pencil,
  Users,
  Settings,
  X,
  Tag,
  FolderTree,
  Loader2,
  Sparkles,
  Mail,
  Send,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubHead {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

interface PaymentHead {
  id: string;
  name: string;
  category: "INCOME" | "EXPENSE";
  description?: string | null;
  isActive: boolean;
  subHeads: SubHead[];
}

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Me {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    company?: {
      id: string;
      name: string;
      slug: string;
      email: string;
      phone?: string | null;
      gstin?: string | null;
      pan?: string | null;
      industry?: string | null;
      address?: string | null;
    } | null;
  };
}

const headSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  category: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().optional(),
});
type HeadFormData = z.infer<typeof headSchema>;

const subHeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().optional(),
});
type SubHeadFormData = z.infer<typeof subHeadSchema>;

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  COMPANY_ADMIN: { label: "Admin", color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  COMPANY_USER: { label: "User", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  FIRM_ADMIN: { label: "Firm Admin", color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  FIRM_ACCOUNTANT: { label: "Accountant", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
};

export default function CompanySettingsPage() {
  const [me, setMe] = useState<Me["user"] | null>(null);
  const [heads, setHeads] = useState<PaymentHead[]>([]);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [headDialogOpen, setHeadDialogOpen] = useState(false);
  const [editingHead, setEditingHead] = useState<PaymentHead | null>(null);
  const [subHeadDialogFor, setSubHeadDialogFor] = useState<PaymentHead | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "COMPANY_USER",
  });

  const headForm = useForm<HeadFormData>({
    resolver: zodResolver(headSchema),
    defaultValues: { name: "", category: "EXPENSE", description: "" },
  });
  const subHeadForm = useForm<SubHeadFormData>({
    resolver: zodResolver(subHeadSchema),
    defaultValues: { name: "", description: "" },
  });

  const loadHeads = useCallback(async () => {
    const res = await fetch("/api/payment-heads");
    if (res.ok) {
      const d = await res.json();
      setHeads(d.heads ?? []);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/company/users");
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users ?? []);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const data = await meRes.json();
          setMe(data.user);
        }
        await Promise.all([loadHeads(), loadUsers()]);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadHeads, loadUsers]);

  function openCreateHead() {
    setEditingHead(null);
    headForm.reset({ name: "", category: "EXPENSE", description: "" });
    setHeadDialogOpen(true);
  }

  function openEditHead(h: PaymentHead) {
    setEditingHead(h);
    headForm.reset({
      name: h.name,
      category: h.category,
      description: h.description ?? "",
    });
    setHeadDialogOpen(true);
  }

  async function onHeadSubmit(data: HeadFormData) {
    setSubmitting(true);
    try {
      const url = editingHead ? `/api/payment-heads/${editingHead.id}` : "/api/payment-heads";
      const method = editingHead ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      toast.success(editingHead ? "Payment head updated" : "Payment head added");
      setHeadDialogOpen(false);
      await loadHeads();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubHeadSubmit(data: SubHeadFormData) {
    if (!subHeadDialogFor) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/payment-heads/${subHeadDialogFor.id}/sub-heads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Sub-head added");
      setSubHeadDialogFor(null);
      subHeadForm.reset({ name: "", description: "" });
      await loadHeads();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteHead(h: PaymentHead) {
    if (!confirm(`Delete payment head "${h.name}"? Its sub-heads will be hidden.`)) return;
    const res = await fetch(`/api/payment-heads/${h.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Payment head removed");
      await loadHeads();
    } else {
      toast.error("Delete failed");
    }
  }

  async function deleteSubHead(s: SubHead) {
    if (!confirm(`Delete sub-head "${s.name}"?`)) return;
    const res = await fetch(`/api/payment-heads/sub-heads/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Sub-head removed");
      await loadHeads();
    } else {
      toast.error("Delete failed");
    }
  }

  const COMPANY_INVITE_ROLES = [
    { label: "Company User", value: "COMPANY_USER" },
    { label: "Company Admin", value: "COMPANY_ADMIN" },
  ];

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) {
      toast.error("Name and email are required");
      return;
    }
    setInviting(true);
    setInviteSuccess(null);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");
      const roleLabel =
        COMPANY_INVITE_ROLES.find((r) => r.value === inviteForm.role)?.label ??
        inviteForm.role;
      setInviteSuccess(
        `Invite has been sent on email for the ${roleLabel} role to ${inviteForm.email}`
      );
      toast.success(data.message || "Invitation sent!");
      setInviteForm({ name: "", email: "", role: "COMPANY_USER" });
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setInviting(false);
    }
  }

  const incomeHeads = heads.filter((h) => h.category === "INCOME");
  const expenseHeads = heads.filter((h) => h.category === "EXPENSE");

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Configure your company profile, chart of accounts and team."
        breadcrumb={[{ label: "Dashboard", href: "/company" }, { label: "Settings" }]}
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <Building2 className="size-3.5" /> Company Profile
          </TabsTrigger>
          <TabsTrigger value="heads">
            <FolderTree className="size-3.5" /> Payment Heads
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="size-3.5" /> Team
          </TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 card-shadow"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                {me?.company?.name?.[0] ?? "C"}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{me?.company?.name ?? "Your Company"}</h2>
                <p className="text-xs text-muted-foreground">{me?.company?.industry ?? "—"}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Email", value: me?.company?.email },
                { label: "Phone", value: me?.company?.phone },
                { label: "GSTIN", value: me?.company?.gstin },
                { label: "PAN", value: me?.company?.pan },
                { label: "Industry", value: me?.company?.industry },
                { label: "Slug", value: me?.company?.slug, mono: true },
              ].map((f) => (
                <div key={f.label} className="bg-muted/40 border border-border rounded-xl px-4 py-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    {f.label}
                  </div>
                  <div className={cn("text-sm text-foreground/90", f.mono && "font-mono")}>
                    {f.value || <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
              ))}
              <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 sm:col-span-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  Registered Address
                </div>
                <div className="text-sm text-foreground/90">
                  {me?.company?.address || <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Inline editing for company profile is coming soon. Contact your accountant to change these details.
            </div>
          </motion.div>
        </TabsContent>

        {/* PAYMENT HEADS */}
        <TabsContent value="heads">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Chart of Accounts</h2>
              <p className="text-xs text-muted-foreground">
                Customize payment heads (income/expense categories) and sub-heads for your business.
              </p>
            </div>
            <Dialog open={headDialogOpen} onOpenChange={setHeadDialogOpen}>
              <DialogTrigger
                render={
                  <Button onClick={openCreateHead}>
                    <Plus className="size-3.5" /> Add Payment Head
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingHead ? "Edit Payment Head" : "New Payment Head"}</DialogTitle>
                  <DialogDescription>
                    Group transactions into categories that make sense for your books.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={headForm.handleSubmit(onHeadSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="head-name">Name</Label>
                    <Input
                      id="head-name"
                      placeholder="e.g. Operating Expenses"
                      {...headForm.register("name")}
                    />
                    {headForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{headForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select
                      value={headForm.watch("category")}
                      onValueChange={(v) =>
                        headForm.setValue("category", v as "INCOME" | "EXPENSE", {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INCOME">
                          <TrendingUp className="size-3.5 text-emerald-500" />
                          Income
                        </SelectItem>
                        <SelectItem value="EXPENSE">
                          <TrendingDown className="size-3.5 text-red-500" />
                          Expense
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="head-desc">Description</Label>
                    <Textarea
                      id="head-desc"
                      rows={3}
                      placeholder="Short note about what this head tracks"
                      {...headForm.register("description")}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="size-3.5 animate-spin" />}
                      {editingHead ? "Save changes" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : heads.length === 0 ? (
            <EmptyHeads onCreate={openCreateHead} />
          ) : (
            <div className="grid lg:grid-cols-2 gap-5">
              <HeadColumn
                title="Income"
                accent="emerald"
                Icon={TrendingUp}
                heads={incomeHeads}
                onEdit={openEditHead}
                onDelete={deleteHead}
                onAddSubHead={(h) => {
                  subHeadForm.reset({ name: "", description: "" });
                  setSubHeadDialogFor(h);
                }}
                onDeleteSubHead={deleteSubHead}
              />
              <HeadColumn
                title="Expense"
                accent="red"
                Icon={TrendingDown}
                heads={expenseHeads}
                onEdit={openEditHead}
                onDelete={deleteHead}
                onAddSubHead={(h) => {
                  subHeadForm.reset({ name: "", description: "" });
                  setSubHeadDialogFor(h);
                }}
                onDeleteSubHead={deleteSubHead}
              />
            </div>
          )}

          {/* Sub-head dialog */}
          <Dialog
            open={!!subHeadDialogFor}
            onOpenChange={(o) => !o && setSubHeadDialogFor(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add sub-head</DialogTitle>
                <DialogDescription>
                  Adds a sub-head under <span className="font-medium">{subHeadDialogFor?.name}</span>.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={subHeadForm.handleSubmit(onSubHeadSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-name">Name</Label>
                  <Input
                    id="sub-name"
                    placeholder="e.g. Cloud Infrastructure"
                    {...subHeadForm.register("name")}
                  />
                  {subHeadForm.formState.errors.name && (
                    <p className="text-xs text-destructive">{subHeadForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-desc">Description</Label>
                  <Textarea id="sub-desc" rows={2} {...subHeadForm.register("description")} />
                </div>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" type="button">Cancel</Button>} />
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="size-3.5 animate-spin" />}
                    Add sub-head
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl overflow-hidden card-shadow"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Team members</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  People with access to your FinBridge company workspace
                </p>
              </div>
              <Button
                onClick={() => {
                  setInviteSuccess(null);
                  setShowInvite(true);
                }}
                className="gap-2"
              >
                <Plus className="size-3.5" />
                Invite Member
              </Button>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground/70">No team members yet</p>
                <p className="text-xs text-muted-foreground mt-1">Invite colleagues from your firm.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => {
                  const roleInfo = ROLE_LABELS[u.role] ?? { label: u.role, color: "" };
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/40 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {initials(u.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                          roleInfo.color
                        )}
                      >
                        {roleInfo.label}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          u.isActive
                            ? "text-emerald-500 bg-emerald-500/10"
                            : "text-muted-foreground bg-muted/60"
                        )}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Invite Member Dialog */}
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Invite Team Member
                </DialogTitle>
                <DialogDescription>
                  Send an invitation to join your company on FinBridge. They will
                  receive an email with login credentials.
                </DialogDescription>
              </DialogHeader>

              {inviteSuccess ? (
                <div className="py-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Invitation Sent!
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    {inviteSuccess}
                  </p>
                  <div className="flex justify-center gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowInvite(false)}
                    >
                      Close
                    </Button>
                    <Button onClick={() => setInviteSuccess(null)}>
                      <Plus className="w-3.5 h-3.5" />
                      Invite Another
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInvite} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input
                      value={inviteForm.name}
                      onChange={(e) =>
                        setInviteForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Ankit Patel"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email Address *</Label>
                    <Input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm((f) => ({ ...f, email: e.target.value }))
                      }
                      placeholder="ankit@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(v) =>
                        setInviteForm((f) => ({ ...f, role: v ?? "COMPANY_USER" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_INVITE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="pt-2">
                    <DialogClose className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer">
                      Cancel
                    </DialogClose>
                    <Button type="submit" disabled={inviting} className="gap-2">
                      {inviting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {inviting ? "Sending…" : "Send Invite"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HeadColumn({
  title,
  accent,
  Icon,
  heads,
  onEdit,
  onDelete,
  onAddSubHead,
  onDeleteSubHead,
}: {
  title: string;
  accent: "emerald" | "red";
  Icon: React.ElementType;
  heads: PaymentHead[];
  onEdit: (h: PaymentHead) => void;
  onDelete: (h: PaymentHead) => void;
  onAddSubHead: (h: PaymentHead) => void;
  onDeleteSubHead: (s: SubHead) => void;
}) {
  const colorClass =
    accent === "emerald"
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : "text-red-500 bg-red-500/10 border-red-500/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden card-shadow"
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center", colorClass)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {heads.length}
        </Badge>
      </div>

      {heads.length === 0 ? (
        <div className="py-10 px-5 text-center">
          <p className="text-xs text-muted-foreground">
            No {title.toLowerCase()} heads yet. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {heads.map((h) => (
            <div key={h.id} className="px-5 py-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{h.name}</div>
                  {h.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {h.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-xs" onClick={() => onEdit(h)}>
                    <Pencil className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => onDelete(h)}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {h.subHeads.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted/60 hover:bg-muted border border-border rounded-full pl-2 pr-1 py-0.5"
                  >
                    <Tag className="size-2.5 text-muted-foreground" />
                    {s.name}
                    <button
                      onClick={() => onDeleteSubHead(s)}
                      className="size-4 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
                      title={`Remove ${s.name}`}
                    >
                      <X className="size-2.5" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => onAddSubHead(h)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:bg-primary/10 border border-dashed border-primary/30 rounded-full px-2 py-0.5 transition-colors"
                >
                  <Plus className="size-2.5" />
                  Add sub-head
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function EmptyHeads({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-card border border-border rounded-2xl py-16 text-center card-shadow"
    >
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
        <Settings className="w-8 h-8 text-indigo-500" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No payment heads yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
        Set up income and expense categories to organise your transactions and reports.
      </p>
      <Button onClick={onCreate}>
        <Plus className="size-3.5" /> Create first payment head
      </Button>
    </motion.div>
  );
}
