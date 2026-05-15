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

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        _count: { select: { documents: true, users: true, reports: true, paymentHeads: true } },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Aggregate transaction stats
    const docs = await prisma.document.findMany({
      where: { companyId: id },
      select: {
        id: true,
        transactions: { select: { status: true, totalAmount: true, acceptedAt: true } },
      },
    });

    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    let underReview = 0;
    let needsInfo = 0;
    let acceptedRevenue = 0;

    for (const d of docs) {
      for (const t of d.transactions) {
        switch (t.status) {
          case "PENDING":
            pending += 1;
            break;
          case "ACCEPTED":
            accepted += 1;
            if (t.totalAmount) acceptedRevenue += t.totalAmount;
            break;
          case "REJECTED":
            rejected += 1;
            break;
          case "UNDER_REVIEW":
            underReview += 1;
            break;
          case "NEEDS_INFO":
            needsInfo += 1;
            break;
        }
      }
    }

    return NextResponse.json({
      company: {
        ...company,
        stats: {
          totalDocuments: company._count.documents,
          totalUsers: company._count.users,
          totalReports: company._count.reports,
          totalPaymentHeads: company._count.paymentHeads,
          pending,
          accepted,
          rejected,
          underReview,
          needsInfo,
          acceptedRevenue,
        },
      },
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
