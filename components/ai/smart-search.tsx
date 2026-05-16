"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Brain, Sparkles, X } from "lucide-react";
import { useLocalAI } from "@/hooks/use-local-ai";

interface SearchItem {
  id: string;
  text: string;
  [key: string]: unknown;
}

interface SmartSearchProps<T extends SearchItem> {
  items: T[];
  onResults: (results: T[]) => void;
  onClear: () => void;
  placeholder?: string;
}

export function SmartSearch<T extends SearchItem>({
  items,
  onResults,
  onClear,
  placeholder = "AI-powered search… try 'food expenses' or 'software subscriptions'",
}: SmartSearchProps<T>) {
  const { isReady, isLoading, search } = useLocalAI();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  const handleSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !isReady) return;

      setSearching(true);
      try {
        const results = await search(q, items, 20);
        // Filter to only reasonably similar results (score > 0.3)
        const filtered = results.filter((r) => r.score > 0.3);
        if (filtered.length > 0) {
          onResults(filtered as unknown as T[]);
          setHasResults(true);
        }
      } catch (err) {
        console.error("[SmartSearch]", err);
      } finally {
        setSearching(false);
      }
    },
    [isReady, search, items, onResults],
  );

  const handleClear = () => {
    setQuery("");
    setHasResults(false);
    onClear();
  };

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      if (hasResults) handleClear();
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <div className="relative">
        {isReady ? (
          <Brain className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isReady ? placeholder : "Search…"}
          disabled={!isReady && !isLoading}
          className="w-full pl-10 pr-20 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all disabled:opacity-50 placeholder:text-muted-foreground/50"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {searching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10"
            >
              <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                Thinking...
              </span>
            </motion.div>
          )}
          {hasResults && !searching && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Clear</span>
            </button>
          )}
          {isReady && !searching && !hasResults && (
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
              AI
            </span>
          )}
          {isLoading && (
            <span className="text-[9px] text-muted-foreground">Loading AI…</span>
          )}
        </div>
      </div>

      {/* AI search tip */}
      <AnimatePresence>
        {isReady && query.length === 0 && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-[10px] text-muted-foreground/60 mt-1 ml-1"
          >
            Powered by on-device AI — search by meaning, not just keywords
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
