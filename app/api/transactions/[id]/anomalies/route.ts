import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectAnomalies, type TransactionData } from "@/lib/anomaly-detection";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error, status } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status });
    }

    const { id } = await params;

    // Fetch the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        document: {
          select: { firmId: true, companyId: true },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Tenant isolation
    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    if (isFirm && transaction.document.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isCompany && transaction.document.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch historical transactions for the same vendor within the firm
    const historicalTransactions = await prisma.transaction.findMany({
      where: {
        document: { firmId: transaction.document.firmId },
        ...(transaction.vendorName
          ? { vendorName: transaction.vendorName }
          : {}),
      },
      select: {
        id: true,
        vendorName: true,
        vendorGstin: true,
        invoiceNumber: true,
        invoiceDate: true,
        amount: true,
        taxAmount: true,
        totalAmount: true,
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });

    const txData: TransactionData = {
      id: transaction.id,
      vendorName: transaction.vendorName,
      vendorGstin: transaction.vendorGstin,
      invoiceNumber: transaction.invoiceNumber,
      invoiceDate: transaction.invoiceDate,
      amount: transaction.amount,
      taxAmount: transaction.taxAmount,
      totalAmount: transaction.totalAmount,
    };

    const anomalies = detectAnomalies(txData, historicalTransactions);

    return NextResponse.json({ anomalies, transactionId: id });
  } catch (err) {
    console.error("Anomaly detection error:", err);
    return NextResponse.json(
      { error: "Failed to detect anomalies" },
      { status: 500 }
    );
  }
}
