"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AlertTriangle,
  FileText,
  Edit3,
  Loader2,
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
  Send,
  Download,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Transaction {
  id: string;
  status: string;
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
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
    taxRate?: number;
  }>;
  bankDetails?: Record<string, string>;
  aiExtracted: boolean;
  confidenceScore?: number;
  extractionNotes?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  document: {
    id: string;
    originalName: string;
    documentType: string;
    mimeType: string;
    filePath: string;
    uploadedAt: string;
    company: { id: string; name: string; slug: string };
    uploadedBy: { name: string; email: string };
  };
}

function ConfidenceGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color =
    pct >= 85 ? "#34d399" : pct >= 65 ? "#fbbf24" : "#f87171";
  const label = pct >= 85 ? "High" : pct >= 65 ? "Medium" : "Low";

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          <motion.circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-semibold text-white">AI Confidence</div>
        <div className="text-xs font-medium" style={{ color }}>{label} confidence</div>
        <div className="text-xs text-muted-foreground mt-0.5">Review all highlighted fields</div>
      </div>
    </div>
  );
}

interface EditFieldProps {
  label: string;
  value: string | number | undefined | null;
  fieldKey: string;
  lowConfidence?: boolean;
  editable: boolean;
  onEdit: (key: string, val: string) => void;
  edits: Record<string, string>;
}

function EditField({ label, value, fieldKey, lowConfidence, editable, onEdit, edits }: EditFieldProps) {
  const [editing, setEditing] = useState(false);
  const displayVal = edits[fieldKey] ?? value;

  if (displayVal === undefined || displayVal === null || displayVal === "") return null;

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-xl border transition-all",
        lowConfidence
          ? "bg-amber-500/5 border-amber-500/25"
          : "bg-muted/50 border-border hover:border-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
            {lowConfidence && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                <AlertTriangle className="w-2.5 h-2.5" />
                Low confidence
              </span>
            )}
            {edits[fieldKey] !== undefined && (
              <span className="text-[10px] text-indigo-400 font-medium">Edited</span>
            )}
          </div>
          {editing ? (
            <input
              autoFocus
              defaultValue={String(displayVal)}
              onBlur={(e) => {
                onEdit(fieldKey, e.target.value);
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onEdit(fieldKey, (e.target as HTMLInputElement).value);
                  setEditing(false);
                }
                if (e.key === "Escape") setEditing(false);
              }}
              className="w-full bg-muted border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          ) : (
            <span className="text-sm font-semibold text-foreground break-all">
              {String(displayVal)}
            </span>
          )}
        </div>
        {editable && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

const FIELD_DEFS = [
  { key: "vendorName", label: "Vendor Name" },
  { key: "vendorGstin", label: "Vendor GSTIN" },
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "invoiceDate", label: "Invoice Date" },
  { key: "dueDate", label: "Due Date" },
  { key: "amount", label: "Subtotal Amount" },
  { key: "taxAmount", label: "Tax Amount" },
  { key: "totalAmount", label: "Total Amount" },
  { key: "currency", label: "Currency" },
  { key: "paymentTerms", label: "Payment Terms" },
  { key: "description", label: "Description" },
] as const;

export default function CompanyTransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setTx(d.transaction ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const canEdit = tx?.status === "PENDING" || tx?.status === "NEEDS_INFO";
  const confidence = tx?.confidenceScore ?? 0;
  const isLowConfidence = confidence < 0.7;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { ...edits };
      // If the accountant requested more info, submitting moves it back to PENDING
      if (tx?.status === "NEEDS_INFO") {
        body.status = "PENDING";
      }
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Update failed");
      }
      toast.success(
        tx?.status === "NEEDS_INFO"
          ? "Transaction re-submitted for review!"
          : "Changes saved successfully!"
      );
      setSubmitted(true);
      setEdits({});
      // Refetch to get updated data
      const refreshRes = await fetch(`/api/transactions/${id}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setTx(refreshData.transaction ?? null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-8" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-96 bg-muted/50 rounded-2xl animate-pulse" />
          <div className="h-96 bg-muted/50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Transaction not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6"
        >
          <Send className="w-10 h-10 text-emerald-400" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Submitted for Review
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          Your transaction has been submitted. Your accountant will review it shortly.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/company/transactions")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            Back to Transactions
          </button>
          <button
            onClick={() => {
              setSubmitted(false);
            }}
            className="bg-muted hover:bg-accent border border-border text-muted-foreground text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Transaction Details"
        subtitle={tx.document.originalName}
        breadcrumb={[
          { label: "Dashboard", href: "/company" },
          { label: "Transactions", href: "/company/transactions" },
          { label: "Details" },
        ]}
        action={<StatusBadge status={tx.status} />}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT: Document preview + metadata */}
        <div className="space-y-4">
          {/* Document preview */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-medium text-foreground">
                  {tx.document.originalName}
                </span>
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {tx.document.documentType.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>

            {tx.document.mimeType.startsWith("image/") ? (
              <div className="p-4">
                <img
                  src={`/api/documents/${tx.document.id}/file`}
                  alt={tx.document.originalName}
                  className="w-full rounded-xl object-contain max-h-[600px] bg-black/20"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : tx.document.mimeType === "application/pdf" ? (
              <div className="p-4">
                <iframe
                  src={`/api/documents/${tx.document.id}/file`}
                  className="w-full h-[600px] rounded-xl border border-border"
                  title={tx.document.originalName}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Preview not available for this file type.
                </p>
                <a
                  href={`/api/documents/${tx.document.id}/file`}
                  download={tx.document.originalName}
                  className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </a>
              </div>
            )}
          </motion.div>

          {/* Document metadata */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Document Details
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24 shrink-0">Company</span>
                <span className="text-foreground/80 font-medium">{tx.document.company?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24 shrink-0">Uploaded by</span>
                <span className="text-foreground/80">{tx.document.uploadedBy?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24 shrink-0">Upload date</span>
                <span className="text-foreground/80">
                  {format(new Date(tx.document.uploadedAt), "dd MMM yyyy, hh:mm a")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-24 shrink-0">File type</span>
                <span className="text-foreground/80">{tx.document.mimeType}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT: Extracted data + actions */}
        <div className="space-y-4">
          {/* Status + confidence gauge */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <ConfidenceGauge score={confidence} />
            {tx.extractionNotes && (
              <div className="mt-3 flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-xs text-amber-300/70">{tx.extractionNotes}</span>
              </div>
            )}
          </motion.div>

          {/* Extracted fields */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Extracted Fields
              </h3>
              {canEdit && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Editable
                </span>
              )}
            </div>
            <div className="space-y-2">
              {FIELD_DEFS.map(({ key, label }, i) => {
                const val = tx[key as keyof Transaction];
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.04 }}
                  >
                    <EditField
                      label={label}
                      value={val as string | number | undefined}
                      fieldKey={key}
                      lowConfidence={isLowConfidence}
                      editable={!!canEdit}
                      onEdit={(k, v) => setEdits((prev) => ({ ...prev, [k]: v }))}
                      edits={edits}
                    />
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Line items */}
          {tx.lineItems && Array.isArray(tx.lineItems) && tx.lineItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Line Items
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Description", "Qty", "Unit Price", "Amount"].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            "py-2.5 text-xs font-medium text-muted-foreground",
                            h === "Description" ? "text-left px-5" : "text-right px-4"
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tx.lineItems as Array<{ description: string; quantity?: number; unitPrice?: number; amount?: number }>).map((item, i) => (
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

          {/* Review notes from accountant */}
          {tx.reviewNotes && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card border border-indigo-500/20 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  Review Notes from Accountant
                </h3>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {tx.reviewNotes}
              </p>
              {tx.reviewedAt && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {format(new Date(tx.reviewedAt), "dd MMM yyyy, hh:mm a")}
                </p>
              )}
            </motion.div>
          )}

          {/* Rejection reason */}
          {tx.status === "REJECTED" && tx.rejectionReason && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 }}
              className="bg-red-500/5 border border-red-500/25 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Rejection Reason
                </h3>
              </div>
              <p className="text-sm text-red-300/80 leading-relaxed whitespace-pre-wrap">
                {tx.rejectionReason}
              </p>
            </motion.div>
          )}

          {/* Total amount highlight */}
          {tx.totalAmount && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border border-indigo-500/20 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Amount</div>
                  <div className="text-2xl font-bold text-white">
                    {"₹"}{tx.totalAmount.toLocaleString("en-IN")}
                  </div>
                </div>
                {tx.taxAmount && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-0.5">Tax</div>
                    <div className="text-sm font-semibold text-indigo-300">
                      {"₹"}{tx.taxAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex gap-3"
          >
            {canEdit && (
              <button
                onClick={handleSubmit}
                disabled={submitting || (Object.keys(edits).length === 0 && tx.status !== "NEEDS_INFO")}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white text-sm font-semibold py-3 rounded-xl shadow-lg shadow-indigo-500/10"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {tx.status === "NEEDS_INFO" ? "Re-submit for Review" : "Save Changes"}
              </button>
            )}
            <Link
              href="/company/transactions"
              className={cn(
                "flex items-center justify-center gap-2 bg-muted hover:bg-accent border border-border text-muted-foreground text-sm font-medium py-3 rounded-xl transition-colors",
                canEdit ? "px-5" : "flex-1"
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Transactions
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
