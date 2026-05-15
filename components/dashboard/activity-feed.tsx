"use client";

import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  icon: LucideIcon;
  iconColor: "blue" | "green" | "amber" | "red" | "violet" | "indigo";
  actor: string;
  action: string;
  target?: string;
  timestamp: string | Date;
}

const ICON_COLORS: Record<ActivityItem["iconColor"], { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/10 dark:bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  green: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
  },
  red: { bg: "bg-red-500/10 dark:bg-red-500/15", text: "text-red-600 dark:text-red-400" },
  violet: {
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
  },
  indigo: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    text: "text-indigo-600 dark:text-indigo-400",
  },
};

interface ActivityFeedProps {
  items: ActivityItem[];
  emptyMessage?: string;
}

export function ActivityFeed({ items, emptyMessage = "No recent activity" }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const Icon = item.icon;
        const colors = ICON_COLORS[item.iconColor];
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                colors.bg
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", colors.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-foreground">
                <span className="font-semibold">{item.actor}</span>{" "}
                <span className="text-muted-foreground">{item.action}</span>
                {item.target && (
                  <>
                    {" "}
                    <span className="font-medium text-foreground">{item.target}</span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
