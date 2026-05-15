import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!session.companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    const [totalDocuments, pendingReview, accepted, rejected, recentActivity] = await Promise.all([
      prisma.transaction.count({
        where: { document: { companyId: session.companyId } },
      }),
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
      prisma.transaction.findMany({
        where: { document: { companyId: session.companyId } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          vendorName: true,
          totalAmount: true,
          createdAt: true,
          document: {
            select: { id: true, originalName: true, documentType: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      totalDocuments,
      pendingReview,
      accepted,
      rejected,
      recentActivity,
    });
  } catch (err) {
    console.error("Company stats error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
