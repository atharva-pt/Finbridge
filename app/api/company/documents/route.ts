import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where: { companyId: session.companyId },
        orderBy: { uploadedAt: "desc" },
        skip,
        take: limit,
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              vendorName: true,
              totalAmount: true,
              confidenceScore: true,
            },
          },
          uploadedBy: { select: { name: true, email: true } },
        },
      }),
      prisma.document.count({ where: { companyId: session.companyId } }),
    ]);

    return NextResponse.json({
      documents,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Company documents error:", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
