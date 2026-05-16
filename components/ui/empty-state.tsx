"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const actionButton = actionLabel ? (
    actionHref ? (
      <Link
        href={actionHref}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
      >
        {actionLabel}
      </Link>
    ) : onAction ? (
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm"
      >
        {actionLabel}
      </button>
    ) : null
  ) : null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center py-20 px-6 text-center overflow-hidden",
        className
      )}
    >
      {/* Decorative background dots pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.06]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Decorative gradient blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/[0.06] via-violet-500/[0.04] to-transparent blur-3xl" />
      </div>

      {/* Floating animated icon */}
      <motion.div
        animate={{
          y: [0, -6, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative mb-6"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-purple-500/5 border border-indigo-500/10 flex items-center justify-center shadow-lg shadow-indigo-500/[0.08]">
          <Icon className="w-9 h-9 text-indigo-500 dark:text-indigo-400" />
        </div>
        {/* Subtle ring */}
        <div className="absolute -inset-2 rounded-[1.25rem] border border-indigo-500/[0.07] pointer-events-none" />
      </motion.div>

      <h3 className="relative text-base font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="relative text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {actionButton && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          {actionButton}
        </motion.div>
      )}
    </div>
  );
}
