import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

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

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const [pendingCount, underReviewCount, acceptedToday, totalCompanies, pendingTransactions] =
      await Promise.all([
        prisma.transaction.count({
          where: { status: "PENDING", document: { firmId: session.firmId } },
        }),
        prisma.transaction.count({
          where: { status: "UNDER_REVIEW", document: { firmId: session.firmId } },
        }),
        prisma.transaction.count({
          where: {
            status: "ACCEPTED",
            acceptedAt: { gte: todayStart, lte: todayEnd },
            document: { firmId: session.firmId },
          },
        }),
        prisma.company.count({
          where: { firmId: session.firmId, isActive: true },
        }),
        prisma.transaction.findMany({
          where: {
            status: { in: ["PENDING", "UNDER_REVIEW"] },
            document: { firmId: session.firmId },
          },
          orderBy: { createdAt: "asc" },
          take: 15,
          include: {
            document: {
              select: {
                id: true,
                originalName: true,
                documentType: true,
                company: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      pendingCount,
      underReviewCount,
      acceptedToday,
      totalCompanies,
      pendingTransactions,
    });
  } catch (err) {
    console.error("Firm stats error:", err);
    return NextResponse.json({ error: "Failed to fetch firm stats" }, { status: 500 });
  }
}
