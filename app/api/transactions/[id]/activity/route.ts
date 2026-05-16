import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Verify transaction exists and user has access
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        document: { select: { firmId: true, companyId: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    if (isFirm && transaction.document.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isCompany && transaction.document.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await prisma.activityLog.findMany({
      where: { transactionId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("Activity GET error:", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
