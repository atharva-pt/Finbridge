"use client";

/**
 * Local AI Model Manager
 * Downloads and runs a Hugging Face model in the browser for:
 * 1. Semantic search across transactions
 * 2. Smart document classification
 * 3. Auto-categorization suggestions
 *
 * Uses @huggingface/transformers (Transformers.js) to run models
 * entirely client-side via WebAssembly/ONNX — no server needed.
 *
 * IMPORTANT: Uses dynamic import() so the heavy onnxruntime bundle
 * is only fetched when AI features are actually used — keeps initial
 * page compile fast.
 */

// Model: all-MiniLM-L6-v2 (~23MB) — best small model for semantic similarity
const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

type ModelStatus = "idle" | "downloading" | "ready" | "error";
type ProgressCallback = (status: ModelStatus, progress?: number) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractor: any = null;
let modelStatus: ModelStatus = "idle";
let modelProgress = 0;
const listeners: Set<ProgressCallback> = new Set();

function notifyListeners() {
  for (const cb of listeners) {
    cb(modelStatus, modelProgress);
  }
}

export function onModelStatusChange(cb: ProgressCallback) {
  listeners.add(cb);
  // Immediately notify current status
  cb(modelStatus, modelProgress);
  return () => {
    listeners.delete(cb);
  };
}

export function getModelStatus(): { status: ModelStatus; progress: number } {
  return { status: modelStatus, progress: modelProgress };
}

/**
 * Download and initialize the model in the background.
 * Safe to call multiple times — only downloads once.
 */
export async function initLocalModel(): Promise<void> {
  if (modelStatus === "ready" || modelStatus === "downloading") return;

  modelStatus = "downloading";
  modelProgress = 0;
  notifyListeners();

  try {
    // Dynamic import — keeps the heavy bundle out of initial compile
    const { pipeline } = await import("@huggingface/transformers");

    extractor = await pipeline("feature-extraction", MODEL_ID, {
      dtype: "fp32",
      progress_callback: (progress: { progress?: number; status?: string }) => {
        if (progress.progress !== undefined) {
          modelProgress = Math.round(progress.progress);
          notifyListeners();
        }
      },
    });

    modelStatus = "ready";
    modelProgress = 100;
    notifyListeners();
  } catch (err) {
    console.error("[LocalAI] Model download failed:", err);
    modelStatus = "error";
    notifyListeners();
  }
}

/**
 * Generate embeddings for a text string.
 * Returns a normalized vector for cosine similarity.
 */
export async function getEmbedding(text: string): Promise<Float32Array | null> {
  if (!extractor || modelStatus !== "ready") return null;

  try {
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    return output.data as Float32Array;
  } catch (err) {
    console.error("[LocalAI] Embedding error:", err);
    return null;
  }
}

/**
 * Compute cosine similarity between two embedding vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot; // already normalized
}

/**
 * Semantic search: rank items by similarity to a query.
 * Each item needs a text field to compare against.
 */
export async function semanticSearch<T extends { text: string }>(
  query: string,
  items: T[],
  topK = 10,
): Promise<Array<T & { score: number }>> {
  if (!extractor || modelStatus !== "ready") return [];

  const queryEmb = await getEmbedding(query);
  if (!queryEmb) return [];

  const scored: Array<T & { score: number }> = [];

  // Batch process for efficiency
  for (const item of items) {
    const itemEmb = await getEmbedding(item.text);
    if (itemEmb) {
      scored.push({ ...item, score: cosineSimilarity(queryEmb, itemEmb) });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Auto-categorize a transaction description into a payment category.
 * Uses embedding similarity against predefined category descriptions.
 */
const EXPENSE_CATEGORIES = [
  { name: "Software & Subscriptions", text: "software subscription SaaS cloud services AWS Azure hosting" },
  { name: "Office Supplies", text: "office supplies stationery printer paper pens notebooks" },
  { name: "Travel & Transport", text: "travel flights hotel accommodation uber taxi cab transport" },
  { name: "Professional Services", text: "consulting legal accounting audit advisory professional services" },
  { name: "Marketing & Advertising", text: "marketing advertising promotion social media campaign digital ads" },
  { name: "Rent & Utilities", text: "rent office space electricity water internet phone utilities" },
  { name: "Salaries & Wages", text: "salary wages payroll employee compensation bonus" },
  { name: "Raw Materials", text: "raw materials manufacturing inventory stock purchase goods" },
  { name: "Food & Beverages", text: "food restaurant catering meals lunch dinner beverages cafe" },
  { name: "Insurance", text: "insurance premium health life property vehicle coverage" },
  { name: "Equipment & Machinery", text: "equipment machinery hardware computer laptop furniture" },
  { name: "Maintenance & Repairs", text: "maintenance repair service fix AMC annual contract" },
];

let categoryEmbeddings: Array<{ name: string; embedding: Float32Array }> | null = null;

async function ensureCategoryEmbeddings() {
  if (categoryEmbeddings) return categoryEmbeddings;
  if (!extractor) return null;

  categoryEmbeddings = [];
  for (const cat of EXPENSE_CATEGORIES) {
    const emb = await getEmbedding(cat.text);
    if (emb) {
      categoryEmbeddings.push({ name: cat.name, embedding: emb });
    }
  }
  return categoryEmbeddings;
}

export async function suggestCategory(
  description: string,
): Promise<Array<{ category: string; confidence: number }>> {
  if (!extractor || modelStatus !== "ready") return [];

  const cats = await ensureCategoryEmbeddings();
  if (!cats || cats.length === 0) return [];

  const descEmb = await getEmbedding(description);
  if (!descEmb) return [];

  const scored = cats.map((cat) => ({
    category: cat.name,
    confidence: cosineSimilarity(descEmb, cat.embedding),
  }));

  scored.sort((a, b) => b.confidence - a.confidence);
  return scored.slice(0, 3).map((s) => ({
    ...s,
    confidence: Math.round(s.confidence * 100) / 100,
  }));
}
