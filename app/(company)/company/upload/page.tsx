"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  Upload,
  FileImage,
  FileText,
  X,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  Edit3,
  Send,
  Loader2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentType = "INVOICE" | "RECEIPT" | "BANK_STATEMENT" | "SALARY_REGISTER" | "LEDGER" | "OTHER";

interface LineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  taxRate?: number;
}

interface ExtractionResult {
  document: { id: string; originalName: string; documentType: string };
  transaction: { id: string; status: string };
  extractedData: {
    vendorName?: string;
    vendorGstin?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    amount?: number;
    taxAmount?: number;
    totalAmount?: number;
    currency?: string;
    description?: string;
    paymentTerms?: string;
    lineItems?: LineItem[];
    bankDetails?: Record<string, string>;
    confidenceScore: number;
    extractionNotes?: string;
  };
}

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "INVOICE", label: "Invoice" },
  { value: "RECEIPT", label: "Receipt" },
  { value: "BANK_STATEMENT", label: "Bank Statement" },
  { value: "SALARY_REGISTER", label: "Salary Register" },
  { value: "LEDGER", label: "Ledger" },
  { value: "OTHER", label: "Other" },
];

type UploadStep = "idle" | "uploading" | "extracting" | "done" | "error";

const STEP_MESSAGES: Record<UploadStep, string> = {
  idle: "",
  uploading: "Uploading document...",
  extracting: "AI is extracting data...",
  done: "Extraction complete!",
  error: "Something went wrong",
};

function ConfidenceIndicator({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 85 ? "text-emerald-400" : pct >= 65 ? "text-amber-400" : "text-red-400";
  const ringColor =
    pct >= 85 ? "stroke-emerald-400" : pct >= 65 ? "stroke-amber-400" : "stroke-red-400";

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
          />
          <motion.circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            className={ringColor}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold", color)}>
          {pct}%
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-white">AI Confidence</div>
        <div className={cn("text-xs font-medium", color)}>
          {pct >= 85 ? "High" : pct >= 65 ? "Medium" : "Low"} confidence
        </div>
      </div>
    </div>
  );
}

interface EditableFieldProps {
  label: string;
  value: string | number | undefined | null;
  lowConfidence?: boolean;
  onSave?: (val: string) => void;
}

function EditableField({ label, value, lowConfidence, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  if (value === undefined || value === null || value === "") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-start justify-between gap-3 px-4 py-3 rounded-xl border transition-colors",
        lowConfidence
          ? "bg-amber-500/5 border-amber-500/20"
          : "bg-muted/50 border-border hover:border-border"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          {lowConfidence && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
              <AlertTriangle className="w-2.5 h-2.5" />
              Review
            </span>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                onSave?.(draft);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSave?.(draft);
                  setEditing(false);
                }
                if (e.key === "Escape") {
                  setDraft(String(value ?? ""));
                  setEditing(false);
                }
              }}
              className="flex-1 bg-muted border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        ) : (
          <span className="text-sm font-semibold text-foreground">{String(value)}</span>
        )}
      </div>
      {!editing && onSave && (
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all mt-0.5"
        >
          <Edit3 className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>("INVOICE");
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setSelectedFile(accepted[0]);
      setResult(null);
      setUploadStep("idle");
      setSubmitted(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      toast.error(err?.code === "file-too-large" ? "File too large (max 10MB)" : "Invalid file type");
    },
  });

  async function handleUpload() {
    if (!selectedFile) return;
    setUploadStep("uploading");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("documentType", docType);

    try {
      setUploadStep("uploading");
      await new Promise((r) => setTimeout(r, 600));
      setUploadStep("extracting");

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setResult(data);
      setUploadStep("done");
      toast.success("AI extraction complete!");
    } catch (err: unknown) {
      setUploadStep("error");
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function handleSubmitForReview() {
    if (!result) return;
    setSubmitting(true);
    try {
      await fetch(`/api/transactions/${result.transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING", ...editedData }),
      });
      setSubmitted(true);
      toast.success("Submitted for accountant review!");
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSelectedFile(null);
    setResult(null);
    setUploadStep("idle");
    setSubmitted(false);
    setEditedData({});
  }

  const ext = result?.extractedData;
  const confidence = ext?.confidenceScore ?? 0;

  const FIELD_DEFS = [
    { key: "vendorName", label: "Vendor Name" },
    { key: "vendorGstin", label: "Vendor GSTIN" },
    { key: "invoiceNumber", label: "Invoice Number" },
    { key: "invoiceDate", label: "Invoice Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "amount", label: "Amount (before tax)" },
    { key: "taxAmount", label: "Tax Amount" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "currency", label: "Currency" },
    { key: "paymentTerms", label: "Payment Terms" },
    { key: "description", label: "Description" },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Upload Document"
        subtitle="Upload an invoice or receipt for AI-powered data extraction"
        breadcrumb={[{ label: "Dashboard", href: "/company" }, { label: "Upload Document" }]}
      />

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-2">Submitted for Review</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs">
            Your accountant will review the extracted data and approve or request additional information.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              Upload Another
            </button>
            <a
              href="/company/transactions"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2.5"
            >
              View Transactions
            </a>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Drop zone */}
          <AnimatePresence>
            {!result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  {...getRootProps()}
                  className={cn(
                    "relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200",
                    isDragActive
                      ? "border-indigo-500 bg-indigo-500/5"
                      : selectedFile
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border bg-muted/50 hover:border-indigo-500/40 hover:bg-indigo-500/3"
                  )}
                >
                  <input {...getInputProps()} />

                  <AnimatePresence mode="wait">
                    {selectedFile ? (
                      <motion.div
                        key="selected"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          {selectedFile.type === "application/pdf" ? (
                            <FileText className="w-7 h-7 text-emerald-400" />
                          ) : (
                            <FileImage className="w-7 h-7 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                          }}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors mt-1"
                        >
                          <X className="w-3 h-3" />
                          Remove file
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center transition-colors",
                          isDragActive
                            ? "bg-indigo-500/20 border border-indigo-500/40"
                            : "bg-muted border border-border"
                        )}>
                          <Upload className={cn("w-7 h-7", isDragActive ? "text-indigo-400" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground/80">
                            {isDragActive ? "Drop it here!" : "Drag invoices here or click to browse"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            JPG, PNG, PDF · Max 10MB
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Document type selector */}
                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-center gap-4"
                  >
                    <div className="relative flex-1">
                      <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="w-full flex items-center justify-between bg-card border border-border hover:border-primary/20 rounded-xl px-4 py-2.5 text-sm text-foreground transition-colors"
                      >
                        <span>
                          Document Type:{" "}
                          <span className="text-foreground font-medium">
                            {DOC_TYPES.find((t) => t.value === docType)?.label}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn("w-4 h-4 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")}
                        />
                      </button>
                      <AnimatePresence>
                        {dropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute top-full left-0 right-0 mt-1.5 bg-[#131320] border border-border rounded-xl overflow-hidden z-20 shadow-xl shadow-black/40"
                          >
                            {DOC_TYPES.map((t) => (
                              <button
                                key={t.value}
                                onClick={() => {
                                  setDocType(t.value);
                                  setDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                                  docType === t.value
                                    ? "bg-indigo-600/20 text-indigo-300"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                              >
                                {t.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={handleUpload}
                      disabled={uploadStep !== "idle" && uploadStep !== "error"}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20"
                    >
                      {uploadStep === "uploading" || uploadStep === "extracting" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {STEP_MESSAGES[uploadStep]}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Extract with AI
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* Progress steps */}
                <AnimatePresence>
                  {(uploadStep === "uploading" || uploadStep === "extracting") && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex items-center gap-4">
                        {[
                          { key: "uploading", label: "Uploading", icon: Upload },
                          { key: "extracting", label: "AI Extracting", icon: Brain },
                          { key: "done", label: "Complete", icon: CheckCircle2 },
                        ].map((s, i) => {
                          const isActive = s.key === uploadStep;
                          const isDone =
                            uploadStep === "extracting" && s.key === "uploading";
                          return (
                            <div key={s.key} className="flex items-center gap-2 flex-1">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                                  isDone
                                    ? "bg-emerald-500/15 border-emerald-500/30"
                                    : isActive
                                    ? "bg-indigo-500/15 border-indigo-500/30"
                                    : "bg-muted/50 border-border"
                                )}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : isActive ? (
                                  <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                                ) : (
                                  <s.icon className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  isDone
                                    ? "text-emerald-400"
                                    : isActive
                                    ? "text-indigo-400"
                                    : "text-muted-foreground"
                                )}
                              >
                                {s.label}
                              </span>
                              {i < 2 && (
                                <div className="flex-1 h-px bg-muted mx-1" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Extraction result */}
          <AnimatePresence>
            {result && ext && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                      <Brain className="w-4.5 h-4.5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">AI Extraction Results</h2>
                      <p className="text-xs text-muted-foreground">{result.document.originalName}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Start over
                  </button>
                </div>

                <div className="grid lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-4">
                    {/* Confidence + notes */}
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <ConfidenceIndicator score={confidence} />
                        {ext.extractionNotes && (
                          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2 max-w-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-xs text-amber-300/70">{ext.extractionNotes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Extracted fields */}
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        Extracted Fields
                      </h3>
                      <div className="space-y-2">
                        {FIELD_DEFS.map(({ key, label }, i) => {
                          const val = (editedData[key] ?? ext[key as keyof typeof ext]) as
                            | string
                            | number
                            | undefined;
                          if (!val) return null;
                          return (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <EditableField
                                label={label}
                                value={val}
                                lowConfidence={confidence < 0.7}
                                onSave={(v) =>
                                  setEditedData((prev) => ({ ...prev, [key]: v }))
                                }
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Line items */}
                    {ext.lineItems && ext.lineItems.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-card border border-border rounded-2xl overflow-hidden"
                      >
                        <div className="px-5 py-4 border-b border-border">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Line Items
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">
                                  Description
                                </th>
                                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                  Qty
                                </th>
                                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                  Unit Price
                                </th>
                                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">
                                  Amount
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {ext.lineItems.map((item, i) => (
                                <tr key={i} className="border-b border-border last:border-0">
                                  <td className="px-5 py-3 text-foreground/80">{item.description}</td>
                                  <td className="px-4 py-3 text-right text-muted-foreground">
                                    {item.quantity ?? "—"}
                                  </td>
                                  <td className="px-4 py-3 text-right text-muted-foreground">
                                    {item.unitPrice
                                      ? `₹${item.unitPrice.toLocaleString("en-IN")}`
                                      : "—"}
                                  </td>
                                  <td className="px-5 py-3 text-right font-semibold text-foreground">
                                    {item.amount
                                      ? `₹${item.amount.toLocaleString("en-IN")}`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Summary + actions sidebar */}
                  <div className="space-y-4">
                    {ext.totalAmount && (
                      <motion.div
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-indigo-900/25 to-violet-900/25 border border-indigo-500/20 rounded-2xl p-5"
                      >
                        <div className="text-xs text-muted-foreground mb-1">Total Amount</div>
                        <div className="text-2xl font-bold text-white">
                          ₹{ext.totalAmount.toLocaleString("en-IN")}
                        </div>
                        {ext.taxAmount && (
                          <div className="text-xs text-indigo-300/60 mt-1">
                            incl. ₹{ext.taxAmount.toLocaleString("en-IN")} tax
                          </div>
                        )}
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="bg-card border border-border rounded-2xl p-5 space-y-3"
                    >
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                      </h3>
                      <button
                        onClick={handleSubmitForReview}
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition-colors text-white text-sm font-semibold py-2.5 rounded-xl"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Submit for Review
                      </button>
                      <button
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 bg-muted hover:bg-accent border border-border transition-colors text-muted-foreground text-sm font-medium py-2.5 rounded-xl"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-card border border-border rounded-2xl p-5"
                    >
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Document Info
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type</span>
                          <span className="text-foreground/80 font-medium">{result.document.documentType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="text-emerald-400 font-medium">AI Extracted</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transaction ID</span>
                          <span className="text-muted-foreground font-mono">
                            {result.transaction.id.slice(-8)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
