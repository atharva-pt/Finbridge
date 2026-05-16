import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  role: z.enum([
    "FIRM_ADMIN",
    "FIRM_ACCOUNTANT",
    "COMPANY_ADMIN",
    "COMPANY_USER",
  ]),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error, status } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status });
    }

    const body = await req.json();
    const data = schema.parse(body);

    // Authorization: who can invite whom
    const isFirmAdmin = session.role === "FIRM_ADMIN";
    const isCompanyAdmin = session.role === "COMPANY_ADMIN";
    const isPlatformAdmin = session.role === "PLATFORM_ADMIN";

    // Firm admin can invite FIRM_ADMIN or FIRM_ACCOUNTANT
    if (["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(data.role)) {
      if (!isFirmAdmin && !isPlatformAdmin) {
        return NextResponse.json(
          { error: "Only firm admins can invite firm members" },
          { status: 403 },
        );
      }
      if (isFirmAdmin && !session.firmId) {
        return NextResponse.json(
          { error: "No firm associated" },
          { status: 400 },
        );
      }
    }

    // Company admin can invite COMPANY_ADMIN or COMPANY_USER
    if (["COMPANY_ADMIN", "COMPANY_USER"].includes(data.role)) {
      if (!isCompanyAdmin && !isFirmAdmin && !isPlatformAdmin) {
        return NextResponse.json(
          { error: "Only company or firm admins can invite company members" },
          { status: 403 },
        );
      }
      if (isCompanyAdmin && !session.companyId) {
        return NextResponse.json(
          { error: "No company associated" },
          { status: 400 },
        );
      }
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists on the platform" },
        { status: 409 },
      );
    }

    // Generate a temporary password (in production, this would be sent via email)
    const tempPassword = `Welcome@${Date.now().toString(36).slice(-6)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Determine firmId and companyId based on inviter context
    let firmId: string | null = null;
    let companyId: string | null = null;

    if (["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(data.role)) {
      firmId = session.firmId ?? null;
    }

    if (["COMPANY_ADMIN", "COMPANY_USER"].includes(data.role)) {
      companyId = session.companyId ?? null;
      // Company users also belong to the firm
      firmId = session.firmId ?? null;
    }

    // Create the invited user as APPROVED (they're being invited by an admin)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        approvalStatus: "APPROVED",
        isActive: true,
        firmId,
        companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: "USER_INVITED",
        description: `${session.email} invited ${data.email} as ${data.role}`,
        userId: session.userId,
        metadata: {
          invitedUserId: user.id,
          invitedEmail: user.email,
          assignedRole: user.role,
        },
      },
    });

    // Create notification for the inviter (confirmation)
    await prisma.notification.create({
      data: {
        userId: session.userId,
        title: "Invitation Sent",
        body: `Invitation email sent to ${data.name} (${data.email}) for the ${ROLE_LABELS[data.role]} role.`,
        type: "success",
      },
    });

    // --- DUMMY EMAIL ---
    // In production, this would send a real email with the temp password / magic link.
    // For now we just log it.
    console.log(
      `[INVITE EMAIL] To: ${data.email}, Name: ${data.name}, Role: ${data.role}, Temp Password: ${tempPassword}`,
    );

    return NextResponse.json({
      user,
      message: `Invitation sent to ${data.email} for the ${ROLE_LABELS[data.role]} role`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: err.issues },
        { status: 400 },
      );
    }
    console.error("Invite error:", err);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 },
    );
  }
}

const ROLE_LABELS: Record<string, string> = {
  FIRM_ADMIN: "Firm Admin",
  FIRM_ACCOUNTANT: "Firm Accountant",
  COMPANY_ADMIN: "Company Admin",
  COMPANY_USER: "Company User",
};
