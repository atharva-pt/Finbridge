"use client";

import { NotificationsBell } from "./notifications-bell";
import { Search } from "lucide-react";

interface TopbarProps {
  showSearch?: boolean;
}

export function Topbar({ showSearch = true }: TopbarProps) {
  return (
    <div className="sticky top-0 z-30 h-14 px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md">
      {showSearch ? (
        <div className="flex items-center gap-2 w-full max-w-md text-muted-foreground">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search transactions, companies, vendors…"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/60 border border-transparent rounded-lg focus:bg-background focus:border-input focus:outline-none focus:ring-1 focus:ring-ring transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1">
        <NotificationsBell />
      </div>
    </div>
  );
}
