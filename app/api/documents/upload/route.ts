import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractDocumentData } from "@/lib/claude";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { apiLogger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const log = apiLogger("POST /api/documents/upload");
const limiter = rateLimit({ interval: 60_000 });

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

export async function POST(req: NextRequest) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }

    const { success } = await limiter.check(20, `upload:${session.userId}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    if (!["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!session.companyId || !session.firmId) {
      return NextResponse.json({ error: "No company or firm associated" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = (formData.get("documentType") as string) || "INVOICE";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPEG, PNG, or PDF." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    log.info({ fileName: file.name, type: file.type, size: file.size, documentType }, "Uploading document");

    // Save file
    const fileId = randomUUID();
    const fileName = `${fileId}${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads", session.firmId, session.companyId);
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));
    log.info({ filePath }, "File saved to disk");

    // Create Document record
    const document = await prisma.document.create({
      data: {
        fileName,
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        filePath,
        documentType: documentType as
          | "INVOICE"
          | "RECEIPT"
          | "BANK_STATEMENT"
          | "SALARY_REGISTER"
          | "LEDGER"
          | "OTHER",
        status: "PENDING",
        firmId: session.firmId,
        companyId: session.companyId,
        uploadedById: session.userId,
      },
    });

    // AI extraction — type-aware prompt
    log.info({ documentId: document.id, documentType }, "Starting Claude extraction");
    let extractedData;
    try {
      extractedData = await extractDocumentData(filePath, file.type, documentType);
      log.info(
        {
          documentId: document.id,
          confidence: extractedData.confidenceScore,
          vendor: extractedData.vendorName,
          suggestedHead: extractedData.suggestedHead,
        },
        "Claude extraction complete"
      );
    } catch (aiErr) {
      log.error({ err: aiErr, documentId: document.id }, "Claude extraction failed");
      extractedData = {
        confidenceScore: 0.1,
        extractionNotes: "AI extraction failed. Please review manually.",
      };
    }

    // Create Transaction
    const transaction = await prisma.transaction.create({
      data: {
        documentId: document.id,
        status: "PENDING",
        vendorName: extractedData.vendorName ?? null,
        vendorGstin: extractedData.vendorGstin ?? null,
        invoiceNumber: extractedData.invoiceNumber ?? null,
        invoiceDate: extractedData.invoiceDate ? new Date(extractedData.invoiceDate) : null,
        dueDate: extractedData.dueDate ? new Date(extractedData.dueDate) : null,
        amount: extractedData.amount ?? null,
        taxAmount: extractedData.taxAmount ?? null,
        totalAmount: extractedData.totalAmount ?? null,
        currency: extractedData.currency ?? "INR",
        description: extractedData.description ?? null,
        paymentTerms: extractedData.paymentTerms ?? null,
        lineItems: extractedData.lineItems
          ? JSON.parse(JSON.stringify(extractedData.lineItems))
          : null,
        bankDetails: extractedData.bankDetails
          ? JSON.parse(JSON.stringify(extractedData.bankDetails))
          : null,
        aiExtracted: true,
        confidenceScore: extractedData.confidenceScore,
        rawAiResponse: JSON.parse(JSON.stringify(extractedData)),
        extractionNotes: extractedData.extractionNotes ?? null,
      },
    });

    // Update document status
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "PENDING" },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "DOCUMENT_UPLOADED",
        description: `Document ${file.name} uploaded and extracted`,
        userId: session.userId,
        documentId: document.id,
        transactionId: transaction.id,
        metadata: { confidenceScore: extractedData.confidenceScore },
      },
    });

    return NextResponse.json({
      document: {
        id: document.id,
        originalName: document.originalName,
        documentType: document.documentType,
      },
      transaction: {
        id: transaction.id,
        status: transaction.status,
      },
      extractedData,
    });
  } catch (err) {
    log.error({ err }, "Upload route unhandled error");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
