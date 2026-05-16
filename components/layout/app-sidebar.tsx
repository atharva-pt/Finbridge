"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Users,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  Shield,
  ClipboardList,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const FIRM_NAV: NavItem[] = [
  { label: "Dashboard", href: "/firm", icon: LayoutDashboard },
  { label: "Review Queue", href: "/firm/transactions", icon: FileText },
  { label: "Companies", href: "/firm/companies", icon: Building2 },
  { label: "Reports", href: "/firm/reports", icon: BarChart3 },
  { label: "Team", href: "/firm/team", icon: Users },
  { label: "Activity Log", href: "/firm/audit", icon: ClipboardList },
];

const COMPANY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/company", icon: LayoutDashboard },
  { label: "Upload Documents", href: "/company/upload", icon: Upload },
  { label: "My Transactions", href: "/company/transactions", icon: FileText },
  { label: "Reports", href: "/company/reports", icon: BarChart3 },
  { label: "Settings", href: "/company/settings", icon: Settings },
];

interface AppSidebarProps {
  role: string;
  user: { name: string; email: string; avatarUrl?: string | null };
}

export function AppSidebar({ role, user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isFirmRole = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(role);
  const navItems = isFirmRole ? FIRM_NAV : COMPANY_NAV;

  const ROLE_LABELS: Record<string, string> = {
    PLATFORM_ADMIN: "Platform Admin",
    FIRM_ADMIN: "Firm Admin",
    FIRM_ACCOUNTANT: "Accountant",
    COMPANY_ADMIN: "Company Admin",
    COMPANY_USER: "Company User",
  };

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Logout failed");
      setLoggingOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/firm" || href === "/company") return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
        <Link href={isFirmRole ? "/firm" : "/company"} className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[15px] font-700 tracking-tight overflow-hidden whitespace-nowrap"
                style={{ fontWeight: 700 }}
              >
                Fin<span className="text-indigo-500 dark:text-indigo-400">Bridge</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Portal label */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pt-5 pb-2"
          >
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              {isFirmRole ? "Accounting Firm" : "Company Portal"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search shortcut */}
      <div className="px-2 pb-2">
        <button
          onClick={() => {
            const event = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            });
            document.dispatchEvent(event);
          }}
          className={cn(
            "w-full flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 hover:bg-accent text-muted-foreground hover:text-foreground transition-all",
            sidebarOpen ? "px-3 py-2" : "justify-center py-2"
          )}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center justify-between flex-1 overflow-hidden whitespace-nowrap"
              >
                <span className="text-xs">Search...</span>
                <kbd className="text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5">
                  ⌘K
                </kbd>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!sidebarOpen ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative",
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon
                className={cn(
                  "w-4 h-4 shrink-0 relative z-10 transition-colors",
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10 overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-3 pt-2 border-t border-border shrink-0 space-y-1">
        {/* Theme toggle */}
        <ThemeToggle collapsed={!sidebarOpen} />

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full hover:bg-accent transition-colors cursor-pointer outline-none",
              sidebarOpen ? "justify-between" : "justify-center"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-border shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                  {initials}
                </div>
              )}
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="min-w-0 overflow-hidden text-left"
                  >
                    <p className="text-xs text-foreground truncate whitespace-nowrap" style={{ fontWeight: 600 }}>
                      {user.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate whitespace-nowrap">
                      {user.email}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64 mb-1">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="pb-3">
                <div className="flex items-center gap-3">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {ROLE_LABELS[role] || role}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loggingOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors card-shadow"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar border-r border-sidebar-border z-50"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 68 }}
        transition={{ type: "spring", bounce: 0, duration: 0.35 }}
        className="hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0 sticky top-0"
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
