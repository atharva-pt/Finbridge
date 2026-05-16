import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  detectAnomalies,
  type Anomaly,
  type TransactionData,
} from "@/lib/anomaly-detection";

export async function GET() {
  try {
    const { session, error, status } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status });
    }

    if (!["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.firmId) {
      return NextResponse.json({ error: "No firm associated" }, { status: 400 });
    }

    // Fetch all PENDING and UNDER_REVIEW transactions for the firm
    const transactions = await prisma.transaction.findMany({
      where: {
        status: { in: ["PENDING", "UNDER_REVIEW"] },
        document: { firmId: session.firmId },
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
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Fetch all transactions for this firm as historical context
    const allTransactions = await prisma.transaction.findMany({
      where: {
        document: { firmId: session.firmId },
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
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    let totalAnomalies = 0;
    let highSeverity = 0;
    let mediumSeverity = 0;
    let lowSeverity = 0;
    const anomaliesByType: Record<string, number> = {};
    const flaggedTransactions: Array<{
      transactionId: string;
      vendorName: string | null;
      amount: number | null;
      anomalies: Anomaly[];
    }> = [];

    for (const tx of transactions) {
      const txData: TransactionData = tx;
      const anomalies = detectAnomalies(txData, allTransactions);

      if (anomalies.length > 0) {
        totalAnomalies += anomalies.length;
        highSeverity += anomalies.filter((a) => a.severity === "high").length;
        mediumSeverity += anomalies.filter((a) => a.severity === "medium").length;
        lowSeverity += anomalies.filter((a) => a.severity === "low").length;

        for (const a of anomalies) {
          anomaliesByType[a.type] = (anomaliesByType[a.type] ?? 0) + 1;
        }

        flaggedTransactions.push({
          transactionId: tx.id,
          vendorName: tx.vendorName,
          amount: tx.totalAmount,
          anomalies,
        });
      }
    }

    // Sort flagged transactions by highest severity first
    flaggedTransactions.sort((a, b) => {
      const maxSev = (arr: Anomaly[]) => {
        if (arr.some((x) => x.severity === "high")) return 3;
        if (arr.some((x) => x.severity === "medium")) return 2;
        return 1;
      };
      return maxSev(b.anomalies) - maxSev(a.anomalies);
    });

    return NextResponse.json({
      totalAnomalies,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      anomaliesByType,
      flaggedTransactions,
    });
  } catch (err) {
    console.error("Firm anomalies error:", err);
    return NextResponse.json(
      { error: "Failed to fetch anomaly summary" },
      { status: 500 }
    );
  }
}
