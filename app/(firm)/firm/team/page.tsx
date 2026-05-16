"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Shield,
  UserCheck,
  Search,
  Plus,
  Loader2,
  CheckCircle2,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  avatarUrl?: string | null;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  FIRM_ADMIN: {
    label: "Admin",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    icon: Shield,
  },
  FIRM_ACCOUNTANT: {
    label: "Accountant",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: UserCheck,
  },
};

const INVITE_ROLES = [
  { label: "Firm Accountant", value: "FIRM_ACCOUNTANT" },
  { label: "Firm Admin", value: "FIRM_ADMIN" },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "FIRM_ACCOUNTANT",
  });

  const loadMembers = useCallback(() => {
    fetch("/api/firm/team")
      .then((r) => r.json())
      .then((d) => setMembers(d.users ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

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
        INVITE_ROLES.find((r) => r.value === inviteForm.role)?.label ??
        inviteForm.role;
      setInviteSuccess(
        `Invite has been sent on email for the ${roleLabel} role to ${inviteForm.email}`
      );
      toast.success(data.message || "Invitation sent!");
      setInviteForm({ name: "", email: "", role: "FIRM_ACCOUNTANT" });
      loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setInviting(false);
    }
  }

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Team"
        subtitle={`${members.length} member${members.length !== 1 ? "s" : ""} in your firm`}
      />

      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search team members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <Button
          onClick={() => {
            setInviteSuccess(null);
            setShowInvite(true);
          }}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-36 bg-muted rounded" />
                <div className="h-2.5 w-48 bg-muted rounded" />
              </div>
              <div className="h-6 w-20 bg-muted rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-medium">
            {search ? "No members match your search" : "No team members found"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((member, i) => {
            const meta = ROLE_META[member.role] ?? ROLE_META.FIRM_ACCOUNTANT;
            const Icon = meta.icon;
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className="bg-card border border-border rounded-2xl p-4 card-shadow flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt={member.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    initials(member.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{member.name}</p>
                    {!member.isActive && (
                      <Badge variant="secondary" className="text-[10px] h-4">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={cn("text-xs gap-1.5 border", meta.color, meta.bg)}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Joined {format(new Date(member.createdAt), "MMM yyyy")}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your firm on FinBridge. They will
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
                <Button
                  onClick={() => setInviteSuccess(null)}
                >
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
                  placeholder="Priya Sharma"
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
                  placeholder="priya@firm.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) =>
                    setInviteForm((f) => ({ ...f, role: v ?? "FIRM_ACCOUNTANT" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITE_ROLES.map((r) => (
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
    </div>
  );
}
