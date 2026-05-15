"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  FileText,
  BarChart3,
  ChevronRight,
  Loader2,
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
import { cn } from "@/lib/utils";

interface CompanyStats {
  pending: number;
  accepted: number;
  rejected: number;
  underReview: number;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  industry?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
  totalDocuments: number;
  totalUsers: number;
  totalReports: number;
  stats: CompanyStats;
}

function companyInitial(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

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

function CompanyCard({ company, index }: { company: Company; index: number }) {
  const total =
    company.stats.pending +
    company.stats.accepted +
    company.stats.rejected +
    company.stats.underReview;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group bg-card border border-border rounded-2xl p-5 card-shadow hover:shadow-lg transition-all cursor-pointer hover:border-primary/30"
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientForName(
            company.name
          )} flex items-center justify-center text-white text-base font-bold shrink-0 shadow-md`}
        >
          {companyInitial(company.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-foreground truncate">{company.name}</h3>
            <Badge
              variant={company.isActive ? "default" : "secondary"}
              className={cn(
                "text-[10px] px-1.5 py-0 h-4",
                company.isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : ""
              )}
            >
              {company.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{company.email}</p>
          {company.industry && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{company.industry}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { icon: FileText, label: "Docs", value: company.totalDocuments, color: "text-blue-500" },
          { icon: Clock, label: "Pending", value: company.stats.pending, color: "text-amber-500" },
          { icon: CheckCircle2, label: "Accepted", value: company.stats.accepted, color: "text-emerald-500" },
          { icon: Users, label: "Users", value: company.totalUsers, color: "text-violet-500" },
        ].map((stat) => (
          <div key={stat.label} className="bg-muted/50 rounded-xl p-2.5 text-center">
            <stat.icon className={cn("w-3.5 h-3.5 mx-auto mb-1", stat.color)} />
            <p className="text-sm font-bold text-foreground tabular-nums">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="mt-3">
          <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
            {company.stats.accepted > 0 && (
              <div
                className="bg-emerald-500 rounded-full"
                style={{ width: `${(company.stats.accepted / total) * 100}%` }}
              />
            )}
            {company.stats.underReview > 0 && (
              <div
                className="bg-blue-500 rounded-full"
                style={{ width: `${(company.stats.underReview / total) * 100}%` }}
              />
            )}
            {company.stats.pending > 0 && (
              <div
                className="bg-amber-500 rounded-full"
                style={{ width: `${(company.stats.pending / total) * 100}%` }}
              />
            )}
            {company.stats.rejected > 0 && (
              <div
                className="bg-red-500 rounded-full"
                style={{ width: `${(company.stats.rejected / total) * 100}%` }}
              />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{total} total transactions</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60 mt-3">
        Onboarded {format(new Date(company.createdAt), "MMM d, yyyy")}
      </p>
    </motion.div>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gstin: "",
    pan: "",
    industry: "",
    address: "",
  });

  async function loadCompanies() {
    try {
      const res = await fetch("/api/firm/companies");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCompanies(data.companies);
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/firm/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`${data.company.name} onboarded successfully`);
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", gstin: "", pan: "", industry: "", address: "" });
      await loadCompanies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setCreating(false);
    }
  }

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.industry?.toLowerCase() ?? "").includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Companies"
        subtitle={`${companies.length} client${companies.length !== 1 ? "s" : ""} onboarded`}
        action={
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Company
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse space-y-3">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-24 bg-muted rounded" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-14 rounded-xl bg-muted" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">
            {search ? "No companies match your search" : "No companies yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? "Try a different search term" : "Click \"Add Company\" to onboard your first client"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((company, i) => (
            <CompanyCard key={company.id} company={company} index={i} />
          ))}
        </div>
      )}

      {/* Add Company Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Onboard New Company</DialogTitle>
            <DialogDescription>
              Add a client company to your firm. They'll be able to upload documents for review.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Company Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="accounts@acme.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Input
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="Technology, Retail…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>GSTIN</Label>
                <Input
                  value={form.gstin}
                  onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
                  placeholder="27AAPFU0939F1ZV"
                />
              </div>
              <div className="space-y-1.5">
                <Label>PAN</Label>
                <Input
                  value={form.pan}
                  onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value }))}
                  placeholder="AAPFU0939F"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Business Park, Mumbai"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {creating ? "Onboarding…" : "Onboard Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
