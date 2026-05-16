"use client";

import { useEffect, useState, useCallback } from "react";
import {
  initChatModel,
  onChatModelStatusChange,
  getChatModelStatus,
  generateLocalResponse,
} from "@/lib/local-chat-model";

type ModelStatus = "idle" | "downloading" | "ready" | "error";

export function useLocalChat() {
  const [status, setStatus] = useState<ModelStatus>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = onChatModelStatusChange((s, p) => {
      setStatus(s);
      setProgress(p ?? 0);
    });

    // Start downloading if not already started
    const current = getChatModelStatus();
    if (current.status === "idle") {
      // Delay chat model download slightly so the embedding model loads first
      const timer = setTimeout(() => initChatModel(), 3000);
      return () => { clearTimeout(timer); unsubscribe(); };
    }

    return unsubscribe;
  }, []);

  const generate = useCallback(
    async (
      message: string,
      context?: string,
      onToken?: (token: string) => void,
    ) => {
      return generateLocalResponse(message, context, onToken);
    },
    [],
  );

  return {
    status,
    progress,
    isReady: status === "ready",
    isLoading: status === "downloading",
    generate,
  };
}
