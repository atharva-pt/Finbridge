"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertTriangle,
  FileText,
  Edit3,
  Loader2,
  ArrowLeft,
  Building2,
  Calendar,
  Hash,
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
  paymentHeadId?: string | null;
  paymentSubHeadId?: string | null;
  paymentHead?: { id: string; name: string; category: string } | null;
  paymentSubHead?: { id: string; name: string } | null;
  rawAiResponse?: {
    suggestedCategory?: "INCOME" | "EXPENSE";
    suggestedHead?: string;
    suggestedSubHead?: string;
  } | null;
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

interface PaymentHead {
  id: string;
  name: string;
  category: string;
  subHeads: Array<{ id: string; name: string }>;
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
  onEdit: (key: string, val: string) => void;
  edits: Record<string, string>;
}

function EditField({ label, value, fieldKey, lowConfidence, onEdit, edits }: EditFieldProps) {
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
        {!editing && (
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

function RejectModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#131320] border border-border rounded-2xl p-6 z-50 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Reject Transaction</h3>
                <p className="text-xs text-muted-foreground">Provide a reason for rejection</p>
              </div>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. GSTIN mismatch, incorrect amount, missing line items..."
              rows={4}
              className="w-full bg-muted/50 border border-border hover:border-primary/20 focus:border-red-500/40 focus:ring-2 focus:ring-red-500/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-all resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-muted hover:bg-accent border border-border text-muted-foreground text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!reason.trim()) {
                    toast.error("Please provide a rejection reason");
                    return;
                  }
                  onConfirm(reason.trim());
                }}
                className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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

export default function TransactionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<"accept" | "reject" | "info" | null>(null);
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);
  const [heads, setHeads] = useState<PaymentHead[]>([]);
  const [paymentHeadId, setPaymentHeadId] = useState<string>("");
  const [paymentSubHeadId, setPaymentSubHeadId] = useState<string>("");

  useEffect(() => {
    fetch(`/api/transactions/${id}`)
      .then((r) => r.json())
      .then(async (d) => {
        const transaction: Transaction | undefined = d.transaction;
        setTx(transaction ?? null);
        setReviewNotes(transaction?.reviewNotes ?? "");
        setPaymentHeadId(transaction?.paymentHeadId ?? "");
        setPaymentSubHeadId(transaction?.paymentSubHeadId ?? "");

        if (transaction?.document?.company?.id) {
          const hRes = await fetch(
            `/api/payment-heads?companyId=${transaction.document.company.id}`
          );
          if (hRes.ok) {
            const hd = await hRes.json();
            setHeads(hd.heads ?? []);

            // Pre-fill from AI suggestion if no head set yet
            const suggested = transaction.rawAiResponse?.suggestedHead?.toLowerCase().trim();
            const suggestedSub = transaction.rawAiResponse?.suggestedSubHead?.toLowerCase().trim();
            if (!transaction.paymentHeadId && suggested && hd.heads) {
              const match = (hd.heads as PaymentHead[]).find(
                (h) => h.name.toLowerCase().trim() === suggested
              );
              if (match) {
                setPaymentHeadId(match.id);
                if (suggestedSub) {
                  const subMatch = match.subHeads.find(
                    (s) => s.name.toLowerCase().trim() === suggestedSub
                  );
                  if (subMatch) setPaymentSubHeadId(subMatch.id);
                }
              }
            }
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const selectedHead = heads.find((h) => h.id === paymentHeadId);
  const aiSuggestedHead = tx?.rawAiResponse?.suggestedHead;
  const aiSuggestedSubHead = tx?.rawAiResponse?.suggestedSubHead;

  async function handleAction(
    status: "ACCEPTED" | "REJECTED" | "NEEDS_INFO",
    rejectionReason?: string
  ) {
    const key =
      status === "ACCEPTED" ? "accept" : status === "REJECTED" ? "reject" : "info";
    setActionLoading(key);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNotes,
          rejectionReason,
          paymentHeadId: paymentHeadId || null,
          paymentSubHeadId: paymentSubHeadId || null,
          ...edits,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      if (status === "ACCEPTED") {
        toast.success("Transaction accepted!");
        setDone("accepted");
      } else if (status === "REJECTED") {
        toast.success("Transaction rejected");
        setDone("rejected");
        setRejectOpen(false);
      } else {
        toast.success("Info requested from company");
        router.push("/firm/transactions");
      }
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoading(null);
    }
  }

  const confidence = tx?.confidenceScore ?? 0;
  const isLowConfidence = confidence < 0.7;

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

  if (done) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mb-6",
            done === "accepted"
              ? "bg-emerald-500/15 border border-emerald-500/30"
              : "bg-red-500/15 border border-red-500/30"
          )}
        >
          {done === "accepted" ? (
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          ) : (
            <XCircle className="w-10 h-10 text-red-400" />
          )}
        </motion.div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Transaction {done === "accepted" ? "Accepted" : "Rejected"}
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          {done === "accepted"
            ? "The transaction has been accepted and recorded."
            : "The transaction has been rejected. The company will be notified."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/firm/transactions")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            Back to Queue
          </button>
          <button
            onClick={() => router.push("/firm")}
            className="bg-muted hover:bg-accent border border-border text-muted-foreground text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <RejectModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => handleAction("REJECTED", reason)}
      />

      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Review Transaction"
          subtitle={tx.document.originalName}
          breadcrumb={[
            { label: "Dashboard", href: "/firm" },
            { label: "Transactions", href: "/firm/transactions" },
            { label: "Review" },
          ]}
          action={<StatusBadge status={tx.status} />}
        />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: Document preview + meta */}
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
                    className="w-full rounded-xl object-contain max-h-80 bg-black/20"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {tx.document.mimeType === "application/pdf"
                      ? "PDF Document"
                      : "Document"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Preview not available. Review extracted data on the right.
                  </p>
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
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Extracted data review panel */}
          <div className="space-y-4">
            {/* Confidence gauge */}
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Extracted Fields
              </h3>
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
                      {(tx.lineItems as Array<{description: string; quantity?: number; unitPrice?: number; amount?: number}>).map((item, i) => (
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

            {/* Payment head categorization */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-card border border-border rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Categorize Under
                </label>
                {aiSuggestedHead && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    AI suggested: {aiSuggestedHead}
                    {aiSuggestedSubHead ? ` · ${aiSuggestedSubHead}` : ""}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Payment Head</label>
                  <select
                    value={paymentHeadId}
                    onChange={(e) => {
                      setPaymentHeadId(e.target.value);
                      setPaymentSubHeadId("");
                    }}
                    className="w-full bg-muted/50 border border-border hover:border-primary/20 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-all"
                  >
                    <option value="">Uncategorized</option>
                    <optgroup label="Income">
                      {heads
                        .filter((h) => h.category === "INCOME")
                        .map((h) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Expense">
                      {heads
                        .filter((h) => h.category === "EXPENSE")
                        .map((h) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Sub-Head</label>
                  <select
                    value={paymentSubHeadId}
                    onChange={(e) => setPaymentSubHeadId(e.target.value)}
                    disabled={!selectedHead || selectedHead.subHeads.length === 0}
                    className="w-full bg-muted/50 border border-border hover:border-primary/20 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 rounded-lg px-3 py-2 text-sm text-white outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">None</option>
                    {selectedHead?.subHeads.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Review notes */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Review Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes for the company or for internal records..."
                rows={3}
                className="w-full bg-muted/50 border border-border hover:border-primary/20 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 rounded-xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-all resize-none"
              />
            </motion.div>

            {/* Total amount highlight */}
            {tx.totalAmount && (
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 }}
                className="bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border border-indigo-500/20 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-white">
                      ₹{tx.totalAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                  {tx.taxAmount && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-0.5">Tax</div>
                      <div className="text-sm font-semibold text-indigo-300">
                        ₹{tx.taxAmount.toLocaleString("en-IN")}
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
              className="grid grid-cols-3 gap-3"
            >
              <button
                onClick={() => handleAction("ACCEPTED")}
                disabled={!!actionLoading || tx.status === "ACCEPTED"}
                className="flex items-center justify-center gap-2 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white text-sm font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/10"
              >
                {actionLoading === "accept" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Accept
              </button>

              <button
                onClick={() => handleAction("NEEDS_INFO")}
                disabled={!!actionLoading}
                className="flex items-center justify-center gap-2 bg-orange-600/60 hover:bg-orange-600/80 disabled:opacity-50 transition-colors text-white text-sm font-semibold py-3 rounded-xl"
              >
                {actionLoading === "info" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                Request Info
              </button>

              <button
                onClick={() => setRejectOpen(true)}
                disabled={!!actionLoading || tx.status === "REJECTED"}
                className="flex items-center justify-center gap-2 bg-red-600/60 hover:bg-red-600/80 disabled:opacity-50 transition-colors text-white text-sm font-semibold py-3 rounded-xl"
              >
                {actionLoading === "reject" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
