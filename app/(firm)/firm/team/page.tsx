"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Users, Mail, Shield, UserCheck, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/firm/team")
      .then((r) => r.json())
      .then((d) => setMembers(d.users ?? []))
      .finally(() => setLoading(false));
  }, []);

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

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search team members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
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
    </div>
  );
}
