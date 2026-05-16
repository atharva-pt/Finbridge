"use client";

import { useLocalAI } from "@/hooks/use-local-ai";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

export function LocalAiBadge() {
  const embedding = useLocalAI();
  const [showTooltip, setShowTooltip] = useState(false);

  if (embedding.status === "idle") return null;

  return (
    <div className="relative">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-accent"
      >
        {embedding.isLoading && (
          <>
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
            <span className="text-muted-foreground hidden sm:inline">
              AI {embedding.progress}%
            </span>
            <div className="hidden sm:block w-12 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${embedding.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </>
        )}
        {embedding.isReady && (
          <>
            <div className="relative">
              <Brain className="w-3.5 h-3.5 text-emerald-500" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline">
              AI Ready
            </span>
          </>
        )}
        {embedding.status === "error" && (
          <>
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400 hidden sm:inline">AI Offline</span>
          </>
        )}
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-72 bg-popover border border-border rounded-xl p-4 shadow-xl z-50"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  On-Device AI
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Hugging Face Transformers.js · Runs in Browser
                </p>
              </div>
            </div>

            {/* Embedding Model */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
              <Brain className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">all-MiniLM-L6-v2</p>
                <p className="text-[10px] text-muted-foreground">Semantic Search · 23MB</p>
              </div>
              {embedding.isReady ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : embedding.isLoading ? (
                <span className="text-[10px] text-indigo-500 font-medium">{embedding.progress}%</span>
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {embedding.isReady
                  ? "AI model running locally in your browser. Semantic search works without sending data to any server."
                  : "Downloading open-source AI model for local inference. Model is cached in your browser — this only happens once."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
