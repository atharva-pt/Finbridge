"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminProfileMenuProps {
  name?: string;
  email?: string;
}

export function AdminSignOutButton({ name, email }: AdminProfileMenuProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = (name || "A")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-accent transition-colors cursor-pointer outline-none">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {initials}
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {name || "Admin"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{name || "Admin"}</p>
                <p className="text-xs text-muted-foreground truncate">{email || ""}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Platform Admin
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={loggingOut}
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {loggingOut ? "Signing out..." : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
