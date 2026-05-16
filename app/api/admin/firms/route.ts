import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendFirmWelcomeEmail } from "@/lib/email";

const log = apiLogger("/api/admin/firms");

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const firms = await prisma.accountingFirm.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, companies: true } },
        users: {
          where: { role: "FIRM_ADMIN" },
          select: {
            id: true,
            name: true,
            email: true,
            approvalStatus: true,
          },
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Reshape: attach admin info at top level for convenience
    const firmsWithAdmin = firms.map((f) => {
      const { users, ...rest } = f;
      const admin = users[0] ?? null;
      return {
        ...rest,
        admin,
        pendingApproval: admin?.approvalStatus === "PENDING_APPROVAL",
      };
    });

    const [totalCompanies, totalUsers, totalDocuments, pendingFirms] =
      await Promise.all([
        prisma.company.count(),
        prisma.user.count(),
        prisma.document.count(),
        prisma.accountingFirm.count({
          where: {
            users: {
              some: {
                role: "FIRM_ADMIN",
                approvalStatus: "PENDING_APPROVAL",
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      firms: firmsWithAdmin,
      stats: { totalCompanies, totalUsers, totalDocuments, pendingFirms },
    });
  } catch (err) {
    log.error({ err }, "GET admin firms failed");
    return NextResponse.json({ error: "Failed to load firms" }, { status: 500 });
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

const createSchema = z.object({
  firmName: z.string().min(2).max(120),
  firmEmail: z.string().email(),
  firmPhone: z.string().optional(),
  plan: z.enum(["starter", "professional", "enterprise"]).default("starter"),
  adminName: z.string().min(2).max(80),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const base = slugify(data.firmName) || "firm";
    let slug = base;
    let suffix = 1;
    while (await prisma.accountingFirm.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
      if (suffix > 50) { slug = `${base}-${Date.now()}`; break; }
    }

    const firm = await prisma.accountingFirm.create({
      data: {
        name: data.firmName,
        slug,
        email: data.firmEmail,
        phone: data.firmPhone || null,
        plan: data.plan,
      },
    });

    const admin = await prisma.user.create({
      data: {
        name: data.adminName,
        email: data.adminEmail,
        passwordHash: await bcrypt.hash(data.adminPassword, 12),
        role: "FIRM_ADMIN",
        approvalStatus: "APPROVED",
        firmId: firm.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "FIRM_ONBOARDED",
        description: `Firm "${firm.name}" onboarded by platform admin`,
        userId: session.userId,
        metadata: { firmId: firm.id, adminId: admin.id },
      },
    });

    log.info({ firmId: firm.id, adminId: admin.id }, "Firm onboarded");

    // Fire-and-forget welcome email to the new firm admin
    sendFirmWelcomeEmail(data.adminEmail, data.adminName, firm.name, data.adminPassword).catch(() => {});

    return NextResponse.json({ firm, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: err.issues }, { status: 400 });
    }
    log.error({ err }, "POST admin firm failed");
    return NextResponse.json({ error: "Failed to onboard firm" }, { status: 500 });
  }
}
