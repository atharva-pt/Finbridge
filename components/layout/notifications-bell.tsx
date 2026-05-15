"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  success: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 mt-2 w-[360px] bg-popover border border-border rounded-2xl card-shadow-md z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {loading && notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin mx-auto" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium">You're all caught up</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      New notifications will appear here
                    </p>
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.map((n) => {
                      const style = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                      const Icon = style.icon;
                      const content = (
                        <div
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors cursor-pointer",
                            !n.read && "bg-primary/[0.03]"
                          )}
                          onClick={() => !n.read && markAsRead(n.id)}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", style.bg)}>
                            <Icon className={cn("w-4 h-4", style.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight">
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {n.body}
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1 font-medium">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {!n.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          )}
                        </div>
                      );
                      return n.link ? (
                        <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                          {content}
                        </Link>
                      ) : (
                        <div key={n.id}>{content}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
