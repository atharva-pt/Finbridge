import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalNotificationEmail } from "@/lib/email";

const schema = z.object({
  userId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED"]),
  role: z
    .enum(["FIRM_ADMIN", "FIRM_ACCOUNTANT", "COMPANY_ADMIN", "COMPANY_USER"])
    .optional(),
  firmId: z.string().optional(),
  companyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["PLATFORM_ADMIN", "FIRM_ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.approvalStatus !== "PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "User is not pending approval" },
        { status: 400 }
      );
    }

    // Build update payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      approvalStatus: data.action,
    };

    if (data.action === "APPROVED") {
      // Assign role if provided, otherwise keep the default
      if (data.role) updateData.role = data.role;
      if (data.firmId) updateData.firmId = data.firmId;
      if (data.companyId) updateData.companyId = data.companyId;
    }

    if (data.action === "REJECTED") {
      updateData.isActive = false;
    }

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approvalStatus: true,
        firmId: true,
        companyId: true,
      },
    });

    // Create in-app notification for the user
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title:
          data.action === "APPROVED"
            ? "Account Approved"
            : "Account Access Denied",
        body:
          data.action === "APPROVED"
            ? "Your FinBridge account has been approved. You can now access the platform."
            : "Your FinBridge account access request has been denied. Please contact the administrator.",
        type: data.action === "APPROVED" ? "success" : "error",
        link: data.action === "APPROVED" ? "/" : undefined,
      },
    });

    // Send email notification to the user about approval/rejection
    try {
      await sendApprovalNotificationEmail(
        targetUser.email,
        targetUser.name,
        data.action
      );
    } catch (emailErr) {
      console.warn("Failed to send approval email (non-blocking):", emailErr);
    }

    // Log this action
    await prisma.auditLog.create({
      data: {
        action: `USER_${data.action}`,
        description: `${session.email} ${data.action.toLowerCase()} user ${targetUser.email}`,
        userId: session.userId,
        metadata: {
          targetUserId: targetUser.id,
          targetEmail: targetUser.email,
          assignedRole: data.role || targetUser.role,
        },
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.issues },
        { status: 400 }
      );
    }
    console.error("Approve user error:", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
