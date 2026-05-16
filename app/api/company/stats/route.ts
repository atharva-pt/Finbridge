import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, format } from "date-fns";

export async function GET() {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }
    if (!["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!session.companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    const [
      totalDocuments,
      totalTransactions,
      pendingReview,
      accepted,
      rejected,
      needsInfo,
      recentActivity,
      acceptedLast6Months,
      vendorTotals,
    ] = await Promise.all([
      // Count actual documents (not transactions)
      prisma.document.count({
        where: { companyId: session.companyId },
      }),
      // Count all transactions
      prisma.transaction.count({
        where: { document: { companyId: session.companyId } },
      }),
      // Pending = PENDING + UNDER_REVIEW
      prisma.transaction.count({
        where: {
          document: { companyId: session.companyId },
          status: { in: ["PENDING", "UNDER_REVIEW"] },
        },
      }),
      prisma.transaction.count({
        where: { document: { companyId: session.companyId }, status: "ACCEPTED" },
      }),
      prisma.transaction.count({
        where: { document: { companyId: session.companyId }, status: "REJECTED" },
      }),
      prisma.transaction.count({
        where: { document: { companyId: session.companyId }, status: "NEEDS_INFO" },
      }),
      // Recent activity — most recent 10 transactions
      prisma.transaction.findMany({
        where: { document: { companyId: session.companyId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          vendorName: true,
          totalAmount: true,
          confidenceScore: true,
          createdAt: true,
          document: {
            select: { id: true, originalName: true, documentType: true },
          },
        },
      }),
      // Accepted transactions in the last 6 months with amounts
      prisma.transaction.findMany({
        where: {
          status: "ACCEPTED",
          document: { companyId: session.companyId },
          totalAmount: { not: null },
          createdAt: { gte: sixMonthsAgo },
        },
        select: { createdAt: true, acceptedAt: true, totalAmount: true },
      }),
      // Top vendors by total amount (accepted transactions only)
      prisma.transaction.findMany({
        where: {
          status: "ACCEPTED",
          document: { companyId: session.companyId },
          vendorName: { not: null },
          totalAmount: { not: null },
        },
        select: { vendorName: true, totalAmount: true },
      }),
    ]);

    // Build monthlySpending: aggregate accepted amounts by month for last 6 months
    // Use createdAt as fallback if acceptedAt is null
    const spendingByMonth = new Map<string, number>();
    for (const tx of acceptedLast6Months) {
      const date = tx.acceptedAt ?? tx.createdAt;
      if (date && tx.totalAmount) {
        const key = format(new Date(date), "yyyy-MM");
        spendingByMonth.set(key, (spendingByMonth.get(key) ?? 0) + tx.totalAmount);
      }
    }

    const monthlySpending: Array<{ month: string; amount: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, "yyyy-MM");
      monthlySpending.push({
        month: format(date, "MMM"),
        amount: Math.round(spendingByMonth.get(key) ?? 0),
      });
    }

    // Build topVendors: top 5 vendors by total accepted amount
    const vendorMap = new Map<string, number>();
    for (const tx of vendorTotals) {
      if (tx.vendorName && tx.totalAmount) {
        vendorMap.set(tx.vendorName, (vendorMap.get(tx.vendorName) ?? 0) + tx.totalAmount);
      }
    }
    const topVendors = Array.from(vendorMap.entries())
      .map(([vendor, amount]) => ({ vendor, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return NextResponse.json({
      totalDocuments,
      totalTransactions,
      pendingReview,
      accepted,
      rejected,
      needsInfo,
      recentActivity,
      monthlySpending,
      topVendors,
    });
  } catch (err) {
    console.error("Company stats error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
