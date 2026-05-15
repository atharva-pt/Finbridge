import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }

    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        document: {
          include: {
            company: { select: { id: true, name: true, slug: true } },
            uploadedBy: { select: { name: true, email: true } },
          },
        },
        assignedTo: { select: { name: true, email: true } },
        paymentHead: { select: { id: true, name: true, category: true } },
        paymentSubHead: { select: { id: true, name: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Tenant isolation check
    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    if (isFirm && transaction.document.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isCompany && transaction.document.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ transaction });
  } catch (err) {
    console.error("Transaction GET error:", err);
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
  }
}

const patchSchema = z.object({
  status: z
    .enum(["PENDING", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "NEEDS_INFO"])
    .optional(),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  vendorName: z.string().optional(),
  vendorGstin: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  taxAmount: z.union([z.string(), z.number()]).optional(),
  totalAmount: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  paymentTerms: z.string().optional(),
  paymentHeadId: z.string().nullable().optional(),
  paymentSubHeadId: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }

    const { id } = await params;

    const body = await req.json();
    const data = patchSchema.parse(body);

    // Verify transaction exists and belongs to authorized tenant
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { document: { select: { id: true, firmId: true, companyId: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    if (isFirm && existing.document.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isCompany && existing.document.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only firm roles can accept/reject
    if (
      ["ACCEPTED", "REJECTED", "NEEDS_INFO", "UNDER_REVIEW"].includes(data.status ?? "") &&
      !isFirm
    ) {
      return NextResponse.json(
        { error: "Only firm accounts can update transaction status" },
        { status: 403 }
      );
    }

    // Build update payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.reviewNotes !== undefined) updateData.reviewNotes = data.reviewNotes;
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;
    if (data.vendorName !== undefined) updateData.vendorName = data.vendorName;
    if (data.vendorGstin !== undefined) updateData.vendorGstin = data.vendorGstin;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.invoiceDate !== undefined)
      updateData.invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : null;
    if (data.dueDate !== undefined)
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.amount !== undefined) updateData.amount = Number(data.amount) || null;
    if (data.taxAmount !== undefined) updateData.taxAmount = Number(data.taxAmount) || null;
    if (data.totalAmount !== undefined) updateData.totalAmount = Number(data.totalAmount) || null;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.paymentHeadId !== undefined) updateData.paymentHeadId = data.paymentHeadId || null;
    if (data.paymentSubHeadId !== undefined) updateData.paymentSubHeadId = data.paymentSubHeadId || null;

    if (data.status === "ACCEPTED") {
      updateData.acceptedAt = new Date();
      updateData.reviewedAt = new Date();
    } else if (data.status === "REJECTED" || data.status === "NEEDS_INFO") {
      updateData.reviewedAt = new Date();
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: updateData,
    });

    // Update document status to match transaction
    if (data.status && existing.document?.id) {
      await prisma.document.update({
        where: { id: existing.document.id },
        data: { status: data.status as "PENDING" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "NEEDS_INFO" },
      }).catch(() => {
        // best-effort
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: `TRANSACTION_${data.status ?? "UPDATED"}`,
        description: `Transaction ${id} updated to ${data.status ?? "modified"}`,
        userId: session.userId,
        transactionId: id,
        metadata: { changes: Object.keys(updateData) },
      },
    });

    // Notify company users when status changes to a terminal/actionable state
    if (
      data.status &&
      ["ACCEPTED", "REJECTED", "NEEDS_INFO"].includes(data.status) &&
      existing.document.companyId
    ) {
      const companyUsers = await prisma.user.findMany({
        where: {
          companyId: existing.document.companyId,
          role: { in: ["COMPANY_ADMIN", "COMPANY_USER"] },
          isActive: true,
        },
        select: { id: true },
      });

      const vendorLabel = existing.vendorName ?? "a document";
      const notifMeta: Record<string, { title: string; body: string; type: string }> = {
        ACCEPTED: {
          title: "Transaction Accepted",
          body: `Your transaction for ${vendorLabel} has been reviewed and accepted.`,
          type: "success",
        },
        REJECTED: {
          title: "Transaction Rejected",
          body: `Your transaction for ${vendorLabel} was rejected. ${data.rejectionReason ? `Reason: ${data.rejectionReason}` : "Check the review notes for details."}`,
          type: "warning",
        },
        NEEDS_INFO: {
          title: "More Information Needed",
          body: `Your accountant needs more info for the ${vendorLabel} transaction. ${data.reviewNotes ?? ""}`.trim(),
          type: "info",
        },
      };

      const meta = notifMeta[data.status];
      if (meta && companyUsers.length > 0) {
        await prisma.notification.createMany({
          data: companyUsers.map((u) => ({
            userId: u.id,
            title: meta.title,
            body: meta.body,
            type: meta.type,
            link: `/company/transactions`,
          })),
        });
      }
    }

    return NextResponse.json({ transaction: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: err.issues }, { status: 400 });
    }
    console.error("Transaction PATCH error:", err);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
