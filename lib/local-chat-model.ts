"use client";

/**
 * Local Chat Model — runs an open-source LLM entirely in the browser.
 *
 * Model: HuggingFaceTB/SmolLM2-360M-Instruct (360M params, ~200MB ONNX)
 * Runtime: @huggingface/transformers (Transformers.js) via WebAssembly/ONNX
 *
 * IMPORTANT: Uses dynamic import() so the heavy onnxruntime bundle
 * is only fetched when AI features are actually used — keeps initial
 * page compile fast.
 */

// Small instruct-tuned model that runs well in browsers
const MODEL_ID = "HuggingFaceTB/SmolLM2-360M-Instruct";

type ModelStatus = "idle" | "downloading" | "ready" | "error";
type ProgressCallback = (status: ModelStatus, progress?: number) => void;
type TokenCallback = (token: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let generator: any = null;
let chatModelStatus: ModelStatus = "idle";
let chatModelProgress = 0;
const listeners: Set<ProgressCallback> = new Set();

function notifyListeners() {
  for (const cb of listeners) {
    cb(chatModelStatus, chatModelProgress);
  }
}

export function onChatModelStatusChange(cb: ProgressCallback) {
  listeners.add(cb);
  cb(chatModelStatus, chatModelProgress);
  return () => { listeners.delete(cb); };
}

export function getChatModelStatus(): { status: ModelStatus; progress: number } {
  return { status: chatModelStatus, progress: chatModelProgress };
}

/**
 * Download and initialize the chat model in background.
 * Safe to call multiple times.
 */
export async function initChatModel(): Promise<void> {
  if (chatModelStatus === "ready" || chatModelStatus === "downloading") return;

  chatModelStatus = "downloading";
  chatModelProgress = 0;
  notifyListeners();

  try {
    // Dynamic import — keeps the heavy bundle out of initial compile
    const { pipeline } = await import("@huggingface/transformers");

    generator = await pipeline("text-generation", MODEL_ID, {
      dtype: "q4f16", // 4-bit quantized for smaller download & faster inference
      device: "wasm",
      progress_callback: (progress: { progress?: number; status?: string }) => {
        if (progress.progress !== undefined) {
          chatModelProgress = Math.round(progress.progress);
          notifyListeners();
        }
      },
    });

    chatModelStatus = "ready";
    chatModelProgress = 100;
    notifyListeners();
  } catch (err) {
    console.error("[LocalChat] Model download failed:", err);
    chatModelStatus = "error";
    notifyListeners();
  }
}

/**
 * Format messages into the chat template expected by SmolLM2-Instruct.
 */
function formatPrompt(
  systemPrompt: string,
  userMessage: string,
  context?: string,
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [
    {
      role: "system",
      content: systemPrompt + (context ? `\n\nHere is the user's financial data context:\n${context}` : ""),
    },
    {
      role: "user",
      content: userMessage,
    },
  ];
  return messages;
}

const FINANCIAL_SYSTEM_PROMPT = `You are FinBridge AI, a helpful financial assistant running locally on the user's device. You help with financial questions about transactions, invoices, spending patterns, and accounting.

Key behaviors:
- Be concise and direct (2-3 sentences max)
- Use Indian Rupee (₹) for currency
- If you don't have enough data, say so honestly
- Format numbers clearly
- Be professional but friendly`;

/**
 * Generate a chat response from the local model.
 * Supports streaming via onToken callback.
 */
export async function generateLocalResponse(
  userMessage: string,
  dataContext?: string,
  onToken?: TokenCallback,
): Promise<string> {
  if (!generator || chatModelStatus !== "ready") {
    throw new Error("Local chat model not ready");
  }

  const messages = formatPrompt(FINANCIAL_SYSTEM_PROMPT, userMessage, dataContext);

  try {
    let fullText = "";

    if (onToken) {
      // Dynamic import for TextStreamer only when needed
      const { TextStreamer } = await import("@huggingface/transformers");

      // Streaming mode
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token: string) => {
          fullText += token;
          onToken(token);
        },
      });

      await generator(messages as unknown as string, {
        max_new_tokens: 256,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        streamer,
      });
    } else {
      // Non-streaming mode
      const output = await generator(messages as unknown as string, {
        max_new_tokens: 256,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
      });

      // Extract generated text
      if (Array.isArray(output) && output.length > 0) {
        const generated = output[0];
        if (typeof generated === "object" && "generated_text" in generated) {
          const genText = generated.generated_text;
          if (Array.isArray(genText)) {
            // Chat format: array of messages
            const lastMsg = genText[genText.length - 1];
            fullText = typeof lastMsg === "object" && "content" in lastMsg
              ? (lastMsg as { content: string }).content
              : String(lastMsg);
          } else {
            fullText = String(genText);
          }
        }
      }
    }

    return fullText.trim() || "I couldn't generate a response. Try asking differently.";
  } catch (err) {
    console.error("[LocalChat] Generation error:", err);
    throw new Error("Failed to generate response from local model");
  }
}
