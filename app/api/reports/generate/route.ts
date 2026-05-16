import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import { z } from "zod";

const querySchema = z.object({
  period: z.enum(["last7", "last30", "last90", "all"]).default("last30"),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error, status } = await validateActiveSession();
    if (!session) return NextResponse.json(error, { status });

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      period: url.searchParams.get("period") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { period } = parsed.data;

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "last7":
        startDate = startOfDay(subDays(now, 7));
        break;
      case "last90":
        startDate = startOfDay(subDays(now, 90));
        break;
      case "all":
        startDate = new Date("2020-01-01");
        break;
      default:
        startDate = startOfDay(subDays(now, 30));
    }

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const whereClause = isFirm
      ? { document: { firmId: session.firmId! } }
      : { document: { companyId: session.companyId! } };

    const transactions = await prisma.transaction.findMany({
      where: {
        ...whereClause,
        status: "ACCEPTED",
        acceptedAt: { gte: startDate, lte: now },
      },
      include: {
        document: {
          select: {
            documentType: true,
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { acceptedAt: "desc" },
    });

    // Aggregations
    const totalAmount = transactions.reduce((s, t) => s + (t.totalAmount ?? 0), 0);
    const totalTax = transactions.reduce((s, t) => s + (t.taxAmount ?? 0), 0);

    // By company
    const byCompany: Record<string, { count: number; amount: number; vendors: Set<string> }> = {};
    for (const tx of transactions) {
      const name = tx.document.company.name;
      if (!byCompany[name]) byCompany[name] = { count: 0, amount: 0, vendors: new Set() };
      byCompany[name].count++;
      byCompany[name].amount += tx.totalAmount ?? 0;
      if (tx.vendorName) byCompany[name].vendors.add(tx.vendorName);
    }
    const companyBreakdown = Object.entries(byCompany)
      .map(([name, d]) => ({ name, count: d.count, amount: d.amount, topVendors: Array.from(d.vendors).slice(0, 5) }))
      .sort((a, b) => b.amount - a.amount);

    // By document type
    const byType: Record<string, { count: number; amount: number }> = {};
    for (const tx of transactions) {
      const type = tx.document.documentType;
      if (!byType[type]) byType[type] = { count: 0, amount: 0 };
      byType[type].count++;
      byType[type].amount += tx.totalAmount ?? 0;
    }
    const typeBreakdown = Object.entries(byType)
      .map(([type, d]) => ({ type, count: d.count, amount: d.amount }))
      .sort((a, b) => b.amount - a.amount);

    // All transactions for table
    const allCounts = await prisma.transaction.groupBy({
      by: ["status"],
      where: { ...whereClause, createdAt: { gte: startDate } },
      _count: { id: true },
    });
    const statusSummary = Object.fromEntries(allCounts.map((c) => [c.status, c._count.id]));

    // Firm/Company name
    let entityName = "";
    if (isFirm && session.firmId) {
      const firm = await prisma.accountingFirm.findUnique({ where: { id: session.firmId }, select: { name: true } });
      entityName = firm?.name ?? "";
    } else if (session.companyId) {
      const company = await prisma.company.findUnique({ where: { id: session.companyId }, select: { name: true } });
      entityName = company?.name ?? "";
    }

    return NextResponse.json({
      entityName,
      isFirm,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalTransactions: transactions.length,
      totalAmount,
      totalTax,
      statusSummary,
      companyBreakdown,
      typeBreakdown,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        vendorName: tx.vendorName,
        invoiceNumber: tx.invoiceNumber,
        invoiceDate: tx.invoiceDate,
        totalAmount: tx.totalAmount,
        taxAmount: tx.taxAmount,
        acceptedAt: tx.acceptedAt,
        company: tx.document.company.name,
        documentType: tx.document.documentType,
      })),
    });
  } catch (err) {
    console.error("Report generation error:", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
