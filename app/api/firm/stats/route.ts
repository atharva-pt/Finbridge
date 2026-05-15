import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

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
    const fourteenDaysAgo = startOfDay(subDays(today, 13));

    const [
      pendingCount,
      underReviewCount,
      acceptedToday,
      totalCompanies,
      pendingTransactions,
      uploadsLast14,
      acceptedLast14,
      recentAuditLogs,
    ] = await Promise.all([
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
      // Uploads (createdAt) in the last 14 days for this firm
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: fourteenDaysAgo },
          document: { firmId: session.firmId },
        },
        select: { createdAt: true },
      }),
      // Accepted transactions in the last 14 days for this firm
      prisma.transaction.findMany({
        where: {
          status: "ACCEPTED",
          acceptedAt: { gte: fourteenDaysAgo },
          document: { firmId: session.firmId },
        },
        select: { acceptedAt: true },
      }),
      // Last 5 audit logs for users in this firm
      prisma.auditLog.findMany({
        where: {
          user: { firmId: session.firmId },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          action: true,
          description: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),
    ]);

    // Build dailyVolume: array of { day, uploads, accepted } for each of the last 14 days
    const uploadsByDay = new Map<string, number>();
    const acceptedByDay = new Map<string, number>();

    for (const tx of uploadsLast14) {
      const key = format(new Date(tx.createdAt), "yyyy-MM-dd");
      uploadsByDay.set(key, (uploadsByDay.get(key) ?? 0) + 1);
    }
    for (const tx of acceptedLast14) {
      if (tx.acceptedAt) {
        const key = format(new Date(tx.acceptedAt), "yyyy-MM-dd");
        acceptedByDay.set(key, (acceptedByDay.get(key) ?? 0) + 1);
      }
    }

    const dailyVolume: Array<{ day: string; uploads: number; accepted: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(today, i);
      const key = format(date, "yyyy-MM-dd");
      dailyVolume.push({
        day: format(date, "MMM d"),
        uploads: uploadsByDay.get(key) ?? 0,
        accepted: acceptedByDay.get(key) ?? 0,
      });
    }

    // Build recentActivity from audit logs
    const recentActivity = recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      createdAt: log.createdAt,
      userName: log.user?.name ?? "System",
    }));

    return NextResponse.json({
      pendingCount,
      underReviewCount,
      acceptedToday,
      totalCompanies,
      pendingTransactions,
      dailyVolume,
      recentActivity,
    });
  } catch (err) {
    console.error("Firm stats error:", err);
    return NextResponse.json({ error: "Failed to fetch firm stats" }, { status: 500 });
  }
}
