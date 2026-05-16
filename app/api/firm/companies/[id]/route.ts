import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const log = apiLogger("/api/firm/companies/[id]");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!session.firmId) {
      return NextResponse.json({ error: "No firm associated" }, { status: 400 });
    }

    const { id } = await params;

    // Look up by ID first, then by slug
    let company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { documents: true, users: true, reports: true, paymentHeads: true } },
      },
    });

    if (!company) {
      // Try slug lookup
      company = await prisma.company.findFirst({
        where: { slug: id, firmId: session.firmId },
        include: {
          users: {
            select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true },
            orderBy: { name: "asc" },
          },
          _count: { select: { documents: true, users: true, reports: true, paymentHeads: true } },
        },
      });
    }

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Documents by status and type
    const [documentsByStatus, documentsByType, recentTransactions, spendingAgg] = await Promise.all([
      prisma.document.groupBy({
        by: ["status"],
        where: { companyId: company.id },
        _count: { _all: true },
      }),
      prisma.document.groupBy({
        by: ["documentType"],
        where: { companyId: company.id },
        _count: { _all: true },
      }),
      prisma.transaction.findMany({
        where: { document: { companyId: company.id } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          vendorName: true,
          amount: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          invoiceDate: true,
          document: { select: { id: true, documentType: true, originalName: true } },
        },
      }),
      prisma.transaction.aggregate({
        where: { document: { companyId: company.id }, status: "ACCEPTED" },
        _sum: { totalAmount: true, amount: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      PENDING: 0, UNDER_REVIEW: 0, ACCEPTED: 0, REJECTED: 0, NEEDS_INFO: 0,
    };
    for (const group of documentsByStatus) {
      statusCounts[group.status] = group._count._all;
    }

    const typeCounts: Record<string, number> = {};
    for (const group of documentsByType) {
      typeCounts[group.documentType] = group._count._all;
    }

    const totalSpending = spendingAgg._sum.totalAmount ?? spendingAgg._sum.amount ?? 0;

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        email: company.email,
        phone: company.phone ?? null,
        gstin: company.gstin ?? null,
        pan: company.pan ?? null,
        address: company.address ?? null,
        industry: company.industry ?? null,
        isActive: company.isActive,
        createdAt: company.createdAt,
        stats: {
          totalDocuments: company._count.documents,
          totalUsers: company._count.users,
          totalReports: company._count.reports,
          totalPaymentHeads: company._count.paymentHeads,
        },
      },
      users: company.users,
      usersCount: company._count.users,
      documentsCount: company._count.documents,
      documentsByStatus: statusCounts,
      documentsByType: typeCounts,
      recentTransactions,
      totalSpending,
    });
  } catch (err) {
    log.error({ err }, "GET company detail failed");
    return NextResponse.json({ error: "Failed to load company" }, { status: 500 });
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  gstin: z.string().nullable().optional(),
  pan: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "FIRM_ADMIN") {
      return NextResponse.json({ error: "Only firm admins can update companies" }, { status: 403 });
    }
    const { id } = await params;

    const existing = await prisma.company.findUnique({ where: { id }, select: { firmId: true } });
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (existing.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = patchSchema.parse(body);

    const company = await prisma.company.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        action: "COMPANY_UPDATED",
        description: `Company "${company.name}" updated`,
        userId: session.userId,
        metadata: { companyId: id, changes: Object.keys(data) },
      },
    });

    return NextResponse.json({ company });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: err.issues }, { status: 400 });
    }
    log.error({ err }, "PATCH company failed");
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}
