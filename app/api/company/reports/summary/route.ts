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
      totalTransactions,
      totalAgg,
      acceptedCount,
      pendingCount,
      rejectedCount,
      allTransactions,
    ] = await Promise.all([
      prisma.transaction.count({
        where: { document: { companyId: session.companyId } },
      }),
      prisma.transaction.aggregate({
        where: { document: { companyId: session.companyId } },
        _sum: { totalAmount: true, taxAmount: true },
      }),
      prisma.transaction.count({
        where: { document: { companyId: session.companyId }, status: "ACCEPTED" },
      }),
      prisma.transaction.count({
        where: {
          document: { companyId: session.companyId },
          status: { in: ["PENDING", "UNDER_REVIEW"] },
        },
      }),
      prisma.transaction.count({
        where: { document: { companyId: session.companyId }, status: "REJECTED" },
      }),
      prisma.transaction.findMany({
        where: { document: { companyId: session.companyId } },
        select: {
          totalAmount: true,
          vendorName: true,
          createdAt: true,
          document: {
            select: { documentType: true },
          },
        },
      }),
    ]);

    // By Document Type
    const docTypeMap = new Map<string, { count: number; amount: number }>();
    for (const tx of allTransactions) {
      const dt = tx.document.documentType;
      const entry = docTypeMap.get(dt) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += tx.totalAmount ?? 0;
      docTypeMap.set(dt, entry);
    }
    const byDocType = Array.from(docTypeMap.entries())
      .map(([type, { count, amount }]) => ({ type, count, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount);

    // By Month (last 6 months)
    const monthMap = new Map<string, { count: number; amount: number }>();
    for (const tx of allTransactions) {
      if (tx.createdAt >= sixMonthsAgo) {
        const key = format(new Date(tx.createdAt), "MMM yyyy");
        const entry = monthMap.get(key) ?? { count: 0, amount: 0 };
        entry.count += 1;
        entry.amount += tx.totalAmount ?? 0;
        monthMap.set(key, entry);
      }
    }
    const byMonth: Array<{ month: string; count: number; amount: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, "MMM yyyy");
      const entry = monthMap.get(key) ?? { count: 0, amount: 0 };
      byMonth.push({ month: key, count: entry.count, amount: Math.round(entry.amount) });
    }

    // Top Vendors
    const vendorMap = new Map<string, { count: number; amount: number }>();
    for (const tx of allTransactions) {
      if (tx.vendorName) {
        const entry = vendorMap.get(tx.vendorName) ?? { count: 0, amount: 0 };
        entry.count += 1;
        entry.amount += tx.totalAmount ?? 0;
        vendorMap.set(tx.vendorName, entry);
      }
    }
    const topVendors = Array.from(vendorMap.entries())
      .map(([vendor, { count, amount }]) => ({ vendor, count, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return NextResponse.json({
      totalTransactions,
      totalAmount: Math.round(totalAgg._sum.totalAmount ?? 0),
      totalTax: Math.round(totalAgg._sum.taxAmount ?? 0),
      acceptedCount,
      pendingCount,
      rejectedCount,
      byDocType,
      byMonth,
      topVendors,
    });
  } catch (err) {
    console.error("Company reports summary error:", err);
    return NextResponse.json({ error: "Failed to generate report summary" }, { status: 500 });
  }
}
