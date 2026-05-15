import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/users — list all users (with optional approval status filter)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only PLATFORM_ADMIN and FIRM_ADMIN can manage users
    if (!["PLATFORM_ADMIN", "FIRM_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("approvalStatus");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (statusFilter) {
      where.approvalStatus = statusFilter;
    }

    // FIRM_ADMIN can only see users in their firm
    if (session.role === "FIRM_ADMIN" && session.firmId) {
      where.firmId = session.firmId;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approvalStatus: true,
        isActive: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
        firmId: true,
        companyId: true,
        firm: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("List users error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
