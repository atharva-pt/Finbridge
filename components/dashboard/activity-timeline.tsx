"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Upload,
  Sparkles,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Pencil,
  MessageSquare,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  performedBy?: string | null;
  performedById?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_CONFIG: Record<
  string,
  {
    icon: typeof Upload;
    color: string;
    dotColor: string;
    bgColor: string;
    label: string;
  }
> = {
  UPLOADED: {
    icon: Upload,
    color: "text-emerald-400",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    label: "Uploaded",
  },
  AI_EXTRACTED: {
    icon: Sparkles,
    color: "text-violet-400",
    dotColor: "bg-violet-500",
    bgColor: "bg-violet-500/10 border-violet-500/20",
    label: "AI Extraction",
  },
  REVIEW_STARTED: {
    icon: Eye,
    color: "text-amber-400",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    label: "Review Started",
  },
  ACCEPTED: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    dotColor: "bg-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    label: "Accepted",
  },
  REJECTED: {
    icon: XCircle,
    color: "text-red-400",
    dotColor: "bg-red-500",
    bgColor: "bg-red-500/10 border-red-500/20",
    label: "Rejected",
  },
  NEEDS_INFO: {
    icon: AlertTriangle,
    color: "text-amber-400",
    dotColor: "bg-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    label: "Needs Info",
  },
  FIELD_EDITED: {
    icon: Pencil,
    color: "text-blue-400",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    label: "Field Edited",
  },
  COMMENT_ADDED: {
    icon: MessageSquare,
    color: "text-blue-400",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    label: "Comment Added",
  },
};

const DEFAULT_CONFIG = {
  icon: Clock,
  color: "text-muted-foreground",
  dotColor: "bg-muted-foreground",
  bgColor: "bg-muted/50 border-border",
  label: "Activity",
};

function getConfig(action: string) {
  return ACTION_CONFIG[action] ?? DEFAULT_CONFIG;
}

export function ActivityTimeline({ transactionId }: { transactionId: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/transactions/${transactionId}/activity`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [transactionId]);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="h-5 w-32 bg-muted rounded-lg animate-pulse mb-6" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                <div className="h-3 w-64 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Activity Timeline
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
        Activity Timeline
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-border" />

        <div className="space-y-1">
          {logs.map((log, index) => {
            const config = getConfig(log.action);
            const Icon = config.icon;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06, duration: 0.3 }}
                className="relative flex gap-4 py-3"
              >
                {/* Dot + icon */}
                <div className="relative z-10 shrink-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full border flex items-center justify-center",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", config.color)} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-sm font-semibold", config.color)}>
                      {config.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {log.description}
                  </p>
                  {log.performedBy && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      by {log.performedBy}
                    </p>
                  )}
                  {log.metadata &&
                    typeof log.metadata === "object" &&
                    "field" in log.metadata && (
                      <div className="mt-2 text-xs bg-muted/50 border border-border rounded-lg px-3 py-2 inline-block">
                        <span className="text-muted-foreground">
                          {String(log.metadata.field)}:{" "}
                        </span>
                        {log.metadata.oldValue !== undefined && (
                          <>
                            <span className="text-red-400/70 line-through">
                              {String(log.metadata.oldValue)}
                            </span>
                            <span className="text-muted-foreground mx-1.5">{"->"}</span>
                          </>
                        )}
                        <span className="text-emerald-400 font-medium">
                          {String(log.metadata.newValue)}
                        </span>
                      </div>
                    )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
