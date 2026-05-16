import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(["ACCEPTED", "REJECTED"]),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }

    // Only firm roles can bulk approve/reject
    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    if (!isFirm) {
      return NextResponse.json(
        { error: "Only firm accounts can perform bulk actions" },
        { status: 403 }
      );
    }

    if (!session.firmId) {
      return NextResponse.json({ error: "No firm associated" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ids, action } = parsed.data;

    // Verify all transactions belong to this firm and are in actionable status
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: ids },
        document: { firmId: session.firmId },
      },
      select: { id: true, status: true, document: { select: { id: true, companyId: true } } },
    });

    if (transactions.length !== ids.length) {
      return NextResponse.json(
        { error: "Some transactions were not found or do not belong to your firm" },
        { status: 403 }
      );
    }

    // Only update transactions that are in actionable statuses
    const actionableStatuses = ["PENDING", "UNDER_REVIEW", "NEEDS_INFO"];
    const actionableIds = transactions
      .filter((tx) => actionableStatuses.includes(tx.status))
      .map((tx) => tx.id);

    if (actionableIds.length === 0) {
      return NextResponse.json(
        { error: "No transactions in actionable status" },
        { status: 400 }
      );
    }

    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      status: action,
      reviewedAt: now,
    };
    if (action === "ACCEPTED") {
      updateData.acceptedAt = now;
    }

    // Bulk update transactions
    const result = await prisma.transaction.updateMany({
      where: { id: { in: actionableIds } },
      data: updateData,
    });

    // Best-effort: update associated document statuses
    const documentIds = transactions
      .filter((tx) => actionableIds.includes(tx.id))
      .map((tx) => tx.document.id);

    if (documentIds.length > 0) {
      await prisma.document
        .updateMany({
          where: { id: { in: documentIds } },
          data: { status: action as "ACCEPTED" | "REJECTED" },
        })
        .catch(() => {
          // best-effort
        });
    }

    // Create audit log entry for the bulk action
    await prisma.auditLog.create({
      data: {
        action: `BULK_TRANSACTION_${action}`,
        description: `Bulk ${action.toLowerCase()} ${actionableIds.length} transaction(s)`,
        userId: session.userId,
        metadata: { transactionIds: actionableIds, action },
      },
    });

    // Notify company users for bulk actions
    const companyIds = [
      ...new Set(
        transactions
          .filter((tx) => actionableIds.includes(tx.id) && tx.document.companyId)
          .map((tx) => tx.document.companyId!)
      ),
    ];

    if (companyIds.length > 0) {
      const companyUsers = await prisma.user.findMany({
        where: {
          companyId: { in: companyIds },
          role: { in: ["COMPANY_ADMIN", "COMPANY_USER"] },
          isActive: true,
        },
        select: { id: true },
      });

      if (companyUsers.length > 0) {
        const title =
          action === "ACCEPTED"
            ? "Transactions Approved"
            : "Transactions Rejected";
        const body =
          action === "ACCEPTED"
            ? `${actionableIds.length} transaction(s) have been approved by your accountant.`
            : `${actionableIds.length} transaction(s) have been rejected by your accountant.`;

        await prisma.notification.createMany({
          data: companyUsers.map((u) => ({
            userId: u.id,
            title,
            body,
            type: action === "ACCEPTED" ? "success" : "warning",
            link: "/company/transactions",
          })),
        });
      }
    }

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: err.issues },
        { status: 400 }
      );
    }
    console.error("Bulk transaction action error:", err);
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
