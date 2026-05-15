"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  const actionButton = action ? (
    <div className="mt-5">
      {action.href ? (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </Link>
      ) : (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-14 px-6 text-center",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>
      )}
      {actionButton}
    </div>
  );
}
