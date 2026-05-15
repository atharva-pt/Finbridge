"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium",
        "text-muted-foreground hover:text-foreground hover:bg-accent",
        "transition-all duration-150 group"
      )}
      aria-label="Toggle theme"
    >
      <div className="relative w-4 h-4 shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: 30, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="w-4 h-4 text-indigo-400" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ scale: 0.5, rotate: 30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.5, rotate: -30, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="w-4 h-4 text-amber-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="overflow-hidden whitespace-nowrap"
          >
            {isDark ? "Dark mode" : "Light mode"}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
