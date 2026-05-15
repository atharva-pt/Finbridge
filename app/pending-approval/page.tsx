"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, LogOut, RefreshCw, Mail, ShieldAlert, Zap } from "lucide-react";

interface MeUser {
  name: string;
  email: string;
  approvalStatus: string;
  createdAt: string;
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [user, setUser] = useState<MeUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        // Not authenticated — send to login
        router.push("/login");
        router.refresh();
        return;
      }
      const data = await res.json();
      const u = data?.user;
      if (!u) {
        router.push("/login");
        router.refresh();
        return;
      }

      setUser(u);

      if (u.approvalStatus === "APPROVED") {
        router.push("/");
        router.refresh();
      } else if (u.approvalStatus === "REJECTED") {
        router.push("/login?error=rejected");
        router.refresh();
      }
    } catch {
      // ignore network errors
    } finally {
      setChecking(false);
      setLoadingUser(false);
    }
  }, [router]);

  // Fetch user info on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-check every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2.5 mb-8"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">FinBridge</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-md text-center"
      >
        <div className="bg-card border border-border rounded-3xl p-8 card-shadow">
          {/* Animated clock icon */}
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <ShieldAlert className="w-10 h-10 text-amber-500" />
            </motion.div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            Approval Required
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Your account has been created, but you need approval from the
            <strong className="text-foreground"> platform administrator </strong>
            before you can access FinBridge. The admin has been notified and will
            review your request.
          </p>

          {/* User info card */}
          {!loadingUser && user && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-muted/50 border border-border rounded-xl p-4 mb-5 text-left"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Your Account
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {user.name
                    .split(" ")
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <div className="ml-auto shrink-0">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading skeleton for user info */}
          {loadingUser && (
            <div className="bg-muted/50 border border-border rounded-xl p-4 mb-5 animate-pulse">
              <div className="h-3 w-24 bg-muted rounded mb-3" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 bg-muted rounded" />
                  <div className="h-3 w-44 bg-muted rounded" />
                </div>
              </div>
            </div>
          )}

          {/* Email notification banner */}
          <div className="flex items-center gap-2.5 justify-center text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-xl p-3 mb-6">
            <Mail className="w-4 h-4 shrink-0 text-primary" />
            <span>
              An email notification has been sent to the admin. You&apos;ll be
              redirected automatically once approved.
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={checkStatus}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${checking ? "animate-spin" : ""}`}
              />
              {checking ? "Checking..." : "Check Approval Status"}
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          This page auto-checks every 30 seconds. You&apos;ll be redirected
          automatically when the admin approves your account.
        </p>
      </motion.div>
    </div>
  );
}
