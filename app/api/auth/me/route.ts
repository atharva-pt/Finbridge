import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approvalStatus: true,
        avatarUrl: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        firmId: true,
        companyId: true,
        firm: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        company: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Get current user error:", err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
