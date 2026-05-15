import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ExtractedDocument {
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
    debit?: number;
    credit?: number;
    balance?: number;
    date?: string;
  }>;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    statementPeriod?: string;
    openingBalance?: number;
    closingBalance?: number;
  };
  // AI-suggested categorization (shown to accountant for one-click apply)
  suggestedCategory?: "INCOME" | "EXPENSE";
  suggestedHead?: string;
  suggestedSubHead?: string;
  confidenceScore: number;
  extractionNotes?: string;
}

// Back-compat alias — existing imports keep working
export type ExtractedInvoice = ExtractedDocument;

const COMMON_FIELDS = `Always return these fields:
- vendorName: vendor/party/employer/bank name
- vendorGstin: GSTIN if visible
- invoiceNumber: document/invoice/statement number
- invoiceDate: primary date as YYYY-MM-DD
- totalAmount: primary total as plain number (no symbols/commas)
- amount: subtotal excluding tax
- taxAmount: GST/VAT/tax amount
- currency: ISO code, default "INR"
- description: one-line plain description
- suggestedCategory: "INCOME" or "EXPENSE" — your best guess
- suggestedHead: payment head name (e.g. "Software Subscriptions", "Salaries & Wages", "Sales Revenue")
- suggestedSubHead: specific sub-head (e.g. "AWS", "December Payroll") or null
- confidenceScore: 0.0–1.0 (≥0.9 clear, 0.6–0.89 partial, <0.6 unclear)
- extractionNotes: caveats or null`;

const PROMPTS: Record<string, string> = {
  INVOICE: `You are extracting an Indian commercial INVOICE.
${COMMON_FIELDS}

Invoice-specific:
- dueDate as YYYY-MM-DD
- paymentTerms: e.g. "Net 30", "Due on receipt"
- lineItems: each {description, quantity, unitPrice, amount, taxRate}
- bankDetails: {bankName, accountNumber, ifscCode, upiId}

suggestedCategory is "EXPENSE" for purchase invoices, "INCOME" for sales invoices — infer from vendor vs buyer context.
Return ONLY valid JSON.`,

  RECEIPT: `You are extracting an Indian payment RECEIPT.
${COMMON_FIELDS}

Receipt-specific:
- lineItems: items {description, quantity, unitPrice, amount}
- paymentTerms: payment method (CASH, UPI, CARD, NEFT, etc.)

suggestedCategory is usually "EXPENSE".
Return ONLY valid JSON.`,

  BANK_STATEMENT: `You are extracting an Indian BANK STATEMENT.
${COMMON_FIELDS}

Bank statement specific:
- vendorName: account holder name
- bankDetails: {bankName, accountNumber, ifscCode, statementPeriod, openingBalance, closingBalance}
- lineItems: each transaction {date: YYYY-MM-DD, description, debit, credit, balance}
- invoiceNumber: statement number/reference if any
- invoiceDate: statement period start
- dueDate: statement period end
- totalAmount: net change (closingBalance − openingBalance)

suggestedCategory: "INCOME" if net credit, "EXPENSE" if net debit.
suggestedHead: "Bank Transactions"
suggestedSubHead: bank name
Return ONLY valid JSON.`,

  SALARY_REGISTER: `You are extracting an Indian SALARY REGISTER / payroll sheet.
${COMMON_FIELDS}

Salary register specific:
- vendorName: company running payroll
- invoiceNumber: period identifier (e.g. "DEC-2024")
- invoiceDate: pay period date
- totalAmount: total net payout (all employees)
- amount: total gross
- taxAmount: total deductions (TDS + PF + ESI)
- description: e.g. "Payroll for December 2024 — 24 employees"
- lineItems: per employee {description: "Name (Designation)", amount: netSalary, unitPrice: gross, taxRate: deductions}

suggestedCategory: "EXPENSE"
suggestedHead: "Salaries & Wages"
suggestedSubHead: the pay period
Return ONLY valid JSON.`,

  LEDGER: `You are extracting an Indian accounting LEDGER.
${COMMON_FIELDS}

Ledger specific:
- vendorName: ledger/account name
- invoiceNumber: ledger reference
- invoiceDate: ledger from-date
- dueDate: ledger to-date
- amount: opening balance
- totalAmount: closing balance
- description: e.g. "Sales ledger FY24-25"
- lineItems: each entry {date, description, debit, credit, balance}

suggestedCategory: "INCOME" if net credit, "EXPENSE" if net debit.
suggestedHead: the ledger name
Return ONLY valid JSON.`,

  OTHER: `You are extracting an Indian financial document. Extract whatever you can.
${COMMON_FIELDS}

Other fields:
- lineItems: any tabular rows
- bankDetails: any bank info
- paymentTerms: any payment terms

Return ONLY valid JSON.`,
};

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export async function extractDocumentData(
  filePath: string,
  mimeType: string,
  documentType: string = "INVOICE",
): Promise<ExtractedDocument> {
  const buf = fs.readFileSync(filePath);
  const base64 = buf.toString("base64");
  const prompt = PROMPTS[documentType] ?? PROMPTS.OTHER;

  type ContentBlock =
    | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } }
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
    | { type: "text"; text: string };

  let content: ContentBlock[];
  if (mimeType === "application/pdf") {
    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      { type: "text", text: prompt },
    ];
  } else {
    const imgType: ImageMediaType = SUPPORTED_IMAGE_TYPES.includes(mimeType as ImageMediaType)
      ? (mimeType as ImageMediaType)
      : "image/jpeg";
    content = [
      {
        type: "image",
        source: { type: "base64", media_type: imgType, data: base64 },
      },
      { type: "text", text: prompt },
    ];
  }

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [{ role: "user", content: content as any }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { confidenceScore: 0.1, extractionNotes: "AI returned no JSON" };
  }
  try {
    return JSON.parse(jsonMatch[0]) as ExtractedDocument;
  } catch {
    return { confidenceScore: 0.15, extractionNotes: "AI returned invalid JSON" };
  }
}

// Back-compat shims so existing call sites keep working
export const extractInvoiceData = (filePath: string, mimeType: string) =>
  extractDocumentData(filePath, mimeType, "INVOICE");
export const extractFromPdf = (filePath: string, documentType: string = "INVOICE") =>
  extractDocumentData(filePath, "application/pdf", documentType);
