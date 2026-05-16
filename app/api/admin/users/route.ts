import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  approvalStatus: z.enum(["PENDING_APPROVAL", "APPROVED", "REJECTED"]).optional(),
});

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
    const parsed = querySchema.safeParse({
      approvalStatus: searchParams.get("approvalStatus") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const statusFilter = parsed.data.approvalStatus;

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

const deleteSchema = z.object({
  userId: z.string().min(1),
});

// DELETE /api/admin/users — permanently delete a user
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = deleteSchema.parse(body);

    // Prevent self-deletion
    if (data.userId === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete related records first (notifications, audit logs authored by user)
    await prisma.notification.deleteMany({ where: { userId: data.userId } });
    await prisma.user.delete({ where: { id: data.userId } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "USER_DELETED",
        description: `${session.email} deleted user ${targetUser.email} (${targetUser.name})`,
        userId: session.userId,
        metadata: {
          deletedUserId: targetUser.id,
          deletedEmail: targetUser.email,
          deletedRole: targetUser.role,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
