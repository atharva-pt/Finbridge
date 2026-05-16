"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  X,
  MessageCircle,
  Bot,
  User,
  Loader2,
  Cloud,
  Cpu,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useLocalChat } from "@/hooks/use-local-chat";

type AiMode = "cloud" | "local";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode?: AiMode;
}

const SUGGESTED_QUESTIONS = [
  "What's my total pending amount?",
  "Show me this week's activity summary",
  "Which vendor has the highest invoices?",
  "How many transactions were accepted today?",
];

export function AiChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AiMode>("cloud");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const localChat = useLocalChat();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Send via Claude API
  const sendCloudMessage = async (text: string): Promise<string> => {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to get response");
    }

    const data = await res.json();
    return data.reply;
  };

  // Send via local model
  const sendLocalMessage = async (text: string): Promise<string> => {
    // Fetch data context for the local model
    let context = "";
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "__context_only__" }),
      });
      if (res.ok) {
        const data = await res.json();
        context = data.context || "";
      }
    } catch {
      // If context fetch fails, continue without it
    }

    return localChat.generate(text, context);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let reply: string;

      if (mode === "local" && localChat.isReady) {
        reply = await sendLocalMessage(text.trim());
      } else {
        reply = await sendCloudMessage(text.trim());
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
        mode: mode === "local" && localChat.isReady ? "local" : "cloud",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      setInput(text.trim());
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (question: string) => {
    sendMessage(question);
  };

  const MODEL_INFO: Record<AiMode, { label: string; sublabel: string; icon: typeof Cloud; color: string }> = {
    cloud: {
      label: "Claude AI",
      sublabel: "Anthropic Cloud",
      icon: Cloud,
      color: "text-violet-500",
    },
    local: {
      label: "SmolLM2",
      sublabel: localChat.isReady
        ? "Running Locally"
        : localChat.isLoading
          ? `Downloading ${localChat.progress}%`
          : "Not Available",
      icon: Cpu,
      color: "text-emerald-500",
    },
  };

  const currentModel = MODEL_INFO[mode];

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-shadow hover:shadow-xl hover:shadow-indigo-500/40"
          >
            <Sparkles className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[420px] max-h-[80vh] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/80"
          >
            {/* Header with model selector */}
            <div className="flex items-center justify-between border-b border-gray-200/50 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-5 py-3 dark:border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    FinBridge AI
                  </h3>
                  {/* Model selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowModeMenu(!showModeMenu)}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                    >
                      <currentModel.icon className={`w-2.5 h-2.5 ${currentModel.color}`} />
                      <span>{currentModel.label}</span>
                      <span className="text-gray-400">·</span>
                      <span>{currentModel.sublabel}</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>

                    <AnimatePresence>
                      {showModeMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-5 left-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden"
                        >
                          {/* Cloud option */}
                          <button
                            onClick={() => { setMode("cloud"); setShowModeMenu(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${mode === "cloud" ? "bg-violet-50 dark:bg-violet-500/10" : ""}`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                              <Cloud className="w-4 h-4 text-violet-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white">Claude AI</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">Anthropic Cloud · Most capable</p>
                            </div>
                            {mode === "cloud" && <span className="ml-auto text-violet-500 text-xs">●</span>}
                          </button>

                          {/* Local option */}
                          <button
                            onClick={() => {
                              if (localChat.isReady) {
                                setMode("local");
                                setShowModeMenu(false);
                              } else if (localChat.isLoading) {
                                toast.info(`Model downloading... ${localChat.progress}%`);
                              }
                            }}
                            disabled={!localChat.isReady && !localChat.isLoading}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-40 ${mode === "local" ? "bg-emerald-50 dark:bg-emerald-500/10" : ""}`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                              <Cpu className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                SmolLM2-360M
                                <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                  OPEN SOURCE
                                </span>
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                {localChat.isReady
                                  ? "HuggingFace · Runs in browser"
                                  : localChat.isLoading
                                    ? `Downloading... ${localChat.progress}%`
                                    : "Not available"}
                              </p>
                            </div>
                            {mode === "local" && <span className="ml-auto text-emerald-500 text-xs">●</span>}
                            {localChat.isLoading && (
                              <Loader2 className="w-3 h-3 text-emerald-500 animate-spin ml-auto shrink-0" />
                            )}
                          </button>

                          {/* Info footer */}
                          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                            <p className="text-[9px] text-gray-400">
                              Local model runs entirely on your device — no data sent to any server.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-2">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
                    <MessageCircle className="h-8 w-8 text-indigo-500" />
                  </div>
                  <h4 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                    How can I help you?
                  </h4>
                  <p className="mb-5 text-center text-xs text-gray-500 dark:text-gray-400">
                    Ask me anything about your transactions, invoices, or financial summaries.
                  </p>
                  <div className="flex w-full flex-col gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSuggestionClick(q)}
                        className="rounded-xl border border-gray-200/80 bg-white/60 px-3.5 py-2.5 text-left text-xs text-gray-700 transition-all hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-gray-700/80 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                      >
                        <span className="mr-1.5 text-indigo-400">&#10024;</span>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                          <Bot className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      <div className="max-w-[80%]">
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                              : "bg-gray-100/80 text-gray-800 dark:bg-gray-800/80 dark:text-gray-200"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {/* Model badge on AI messages */}
                        {msg.role === "assistant" && msg.mode && (
                          <div className="mt-1 flex items-center gap-1">
                            {msg.mode === "local" ? (
                              <>
                                <Cpu className="w-2.5 h-2.5 text-emerald-500" />
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400">SmolLM2 · Local</span>
                              </>
                            ) : (
                              <>
                                <Cloud className="w-2.5 h-2.5 text-violet-500" />
                                <span className="text-[9px] text-violet-600 dark:text-violet-400">Claude · Cloud</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
                          <User className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                        <Bot className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="rounded-2xl bg-gray-100/80 px-4 py-3 dark:bg-gray-800/80">
                        <div className="flex items-center gap-1.5">
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} className="h-2 w-2 rounded-full bg-indigo-400" />
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} className="h-2 w-2 rounded-full bg-indigo-400" />
                          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} className="h-2 w-2 rounded-full bg-indigo-400" />
                          <span className="ml-2 text-[10px] text-gray-400">
                            {mode === "local" && localChat.isReady ? "Thinking locally..." : "Thinking..."}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-t border-gray-200/50 bg-white/60 px-4 py-3 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/60">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your finances..."
                  disabled={isLoading}
                  className="flex-1 rounded-xl border border-gray-200/80 bg-white/80 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 dark:border-gray-700/80 dark:bg-gray-800/80 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg hover:shadow-indigo-500/30 disabled:opacity-40 disabled:shadow-none"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
              <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
                {mode === "local" && localChat.isReady ? (
                  <>
                    <Cpu className="w-2.5 h-2.5 inline mr-0.5" />
                    Running on-device · No data leaves your browser
                  </>
                ) : (
                  <>Powered by Claude AI · Answers based on your real data</>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
