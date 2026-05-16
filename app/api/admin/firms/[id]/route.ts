import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const log = apiLogger("/api/admin/firms/[id]");

// ---------- GET — firm detail with companies, users, doc/txn stats ----------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const firm = await prisma.accountingFirm.findUnique({
      where: { id },
      include: {
        companies: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { documents: true } } },
        },
        users: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            approvalStatus: true,
            createdAt: true,
          },
        },
        _count: { select: { companies: true, users: true, documents: true } },
      },
    });

    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    // Gather transaction status counts for all documents under this firm
    const companyIds = firm.companies.map((c) => c.id);
    let transactionStats = { PENDING: 0, UNDER_REVIEW: 0, ACCEPTED: 0, REJECTED: 0, NEEDS_INFO: 0, total: 0 };

    if (companyIds.length > 0) {
      const statusCounts = await prisma.transaction.groupBy({
        by: ["status"],
        where: { document: { firmId: id } },
        _count: { _all: true },
      });

      let total = 0;
      for (const row of statusCounts) {
        transactionStats[row.status as keyof typeof transactionStats] = row._count._all;
        total += row._count._all;
      }
      transactionStats.total = total;
    }

    return NextResponse.json({
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        email: firm.email,
        phone: firm.phone,
        logoUrl: firm.logoUrl,
        plan: firm.plan,
        isActive: firm.isActive,
        createdAt: firm.createdAt,
      },
      companies: firm.companies,
      users: firm.users,
      counts: {
        companies: firm._count.companies,
        users: firm._count.users,
        documents: firm._count.documents,
      },
      transactionStats,
    });
  } catch (err) {
    log.error({ err }, "GET firm detail failed");
    return NextResponse.json({ error: "Failed to load firm" }, { status: 500 });
  }
}

// ---------- PATCH — toggle active / update plan ----------
const patchSchema = z.object({
  isActive: z.boolean().optional(),
  plan: z.enum(["starter", "professional", "enterprise"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = patchSchema.parse(body);

    const firm = await prisma.accountingFirm.findUnique({ where: { id } });
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    const updated = await prisma.accountingFirm.update({
      where: { id },
      data,
    });

    // If deactivating, also deactivate all users under this firm
    if (data.isActive === false) {
      await prisma.user.updateMany({
        where: { firmId: id },
        data: { isActive: false },
      });
      log.info({ firmId: id }, "Firm and its users deactivated");
    } else if (data.isActive === true) {
      await prisma.user.updateMany({
        where: { firmId: id },
        data: { isActive: true },
      });
      log.info({ firmId: id }, "Firm and its users reactivated");
    }

    await prisma.auditLog.create({
      data: {
        action: "FIRM_UPDATED",
        description: `Firm "${firm.name}" updated by platform admin`,
        userId: session.userId,
        metadata: { firmId: id, changes: data },
      },
    });

    return NextResponse.json({ firm: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: err.issues }, { status: 400 });
    }
    log.error({ err }, "PATCH firm failed");
    return NextResponse.json({ error: "Failed to update firm" }, { status: 500 });
  }
}

// ---------- DELETE — permanently remove firm + all associated data ----------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const firm = await prisma.accountingFirm.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, companies: true } },
      },
    });
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    // Delete in order to respect foreign keys:
    // 1. Documents uploaded by firm users (via company relation)
    // 2. Users under the firm
    // 3. Companies linked to the firm
    // 4. The firm itself

    // Get all company IDs under this firm
    const companyIds = (
      await prisma.company.findMany({ where: { firmId: id }, select: { id: true } })
    ).map((c) => c.id);

    // Get all user IDs under this firm
    const userIds = (
      await prisma.user.findMany({ where: { firmId: id }, select: { id: true } })
    ).map((u) => u.id);

    // Delete documents under those companies
    if (companyIds.length > 0) {
      await prisma.document.deleteMany({ where: { companyId: { in: companyIds } } });
    }

    // Delete notifications for firm users
    if (userIds.length > 0) {
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    }

    // Delete audit logs referencing firm users
    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }

    // Delete users
    await prisma.user.deleteMany({ where: { firmId: id } });

    // Delete companies
    await prisma.company.deleteMany({ where: { firmId: id } });

    // Delete the firm
    await prisma.accountingFirm.delete({ where: { id } });

    // Audit log (use platform admin's userId since firm users are gone)
    await prisma.auditLog.create({
      data: {
        action: "FIRM_DELETED",
        description: `Firm "${firm.name}" permanently deleted (${firm._count.users} users, ${firm._count.companies} companies removed)`,
        userId: session.userId,
        metadata: { firmName: firm.name, firmSlug: firm.slug },
      },
    });

    log.info({ firmId: id, firmName: firm.name }, "Firm permanently deleted");
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error({ err }, "DELETE firm failed");
    return NextResponse.json({ error: "Failed to delete firm" }, { status: 500 });
  }
}
