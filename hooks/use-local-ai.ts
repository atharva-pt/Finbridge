"use client";

import { useEffect, useState, useCallback } from "react";
import {
  initLocalModel,
  onModelStatusChange,
  getModelStatus,
  semanticSearch,
  suggestCategory,
} from "@/lib/local-ai";

type ModelStatus = "idle" | "downloading" | "ready" | "error";

export function useLocalAI() {
  const [status, setStatus] = useState<ModelStatus>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = onModelStatusChange((s, p) => {
      setStatus(s);
      setProgress(p ?? 0);
    });

    // Start downloading if not already
    const current = getModelStatus();
    if (current.status === "idle") {
      initLocalModel();
    }

    return unsubscribe;
  }, []);

  const search = useCallback(
    async <T extends { text: string }>(query: string, items: T[], topK?: number) => {
      return semanticSearch(query, items, topK);
    },
    [],
  );

  const categorize = useCallback(async (description: string) => {
    return suggestCategory(description);
  }, []);

  return {
    status,
    progress,
    isReady: status === "ready",
    isLoading: status === "downloading",
    search,
    categorize,
  };
}
