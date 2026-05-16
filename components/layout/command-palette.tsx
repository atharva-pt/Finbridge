"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FileText,
  Building2,
  ArrowRight,
  Loader2,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  type: "transaction" | "company" | "page";
  id: string;
  title: string;
  subtitle: string;
  url: string;
  icon: string;
}

const ICON_MAP: Record<string, typeof FileText> = {
  FileText,
  Building2,
  ArrowRight,
};

const TYPE_LABELS: Record<string, string> = {
  transaction: "Transactions",
  company: "Companies",
  page: "Pages",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    setActiveIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function navigate(result: SearchResult) {
    setOpen(false);
    router.push(result.url);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Group results by type
  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              {loading ? (
                <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
              ) : (
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search transactions, companies, pages..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {query && !loading && results.length === 0 && (
                <div className="py-12 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No results for &quot;{query}&quot;
                  </p>
                </div>
              )}

              {!query && (
                <div className="py-10 text-center">
                  <Command className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Start typing to search...
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Transactions, companies, and pages
                  </p>
                </div>
              )}

              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    {TYPE_LABELS[type] ?? type}
                  </div>
                  {items.map((result) => {
                    flatIndex++;
                    const idx = flatIndex;
                    const IconComp = ICON_MAP[result.icon] ?? ArrowRight;
                    return (
                      <button
                        key={result.id}
                        onClick={() => navigate(result)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          idx === activeIndex
                            ? "bg-accent"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            type === "transaction"
                              ? "bg-blue-500/10 text-blue-500"
                              : type === "company"
                                ? "bg-violet-500/10 text-violet-500"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {result.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        </div>
                        {idx === activeIndex && (
                          <kbd className="text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 font-mono shrink-0">
                            Enter
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
