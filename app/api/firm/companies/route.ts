import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { getTemplateForIndustry } from "@/lib/payment-head-templates";
import { z } from "zod";

const log = apiLogger("/api/firm/companies");

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function GET() {
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

    const companies = await prisma.company.findMany({
      where: { firmId: session.firmId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            documents: true,
            users: true,
            reports: true,
          },
        },
      },
    });

    // Get pending/accepted counts per company
    const companyIds = companies.map((c) => c.id);
    const txGroups = companyIds.length
      ? await prisma.transaction.groupBy({
          by: ["status"],
          where: { document: { companyId: { in: companyIds } } },
          _count: { _all: true },
        })
      : [];

    // Per-company counts
    const perCompanyTx = companyIds.length
      ? await prisma.document.findMany({
          where: { companyId: { in: companyIds } },
          select: {
            companyId: true,
            transactions: { select: { status: true } },
          },
        })
      : [];

    const statsMap = new Map<string, { pending: number; accepted: number; rejected: number; underReview: number }>();
    for (const id of companyIds) {
      statsMap.set(id, { pending: 0, accepted: 0, rejected: 0, underReview: 0 });
    }
    for (const doc of perCompanyTx) {
      const bucket = statsMap.get(doc.companyId);
      if (!bucket) continue;
      for (const t of doc.transactions) {
        if (t.status === "PENDING") bucket.pending += 1;
        else if (t.status === "ACCEPTED") bucket.accepted += 1;
        else if (t.status === "REJECTED") bucket.rejected += 1;
        else if (t.status === "UNDER_REVIEW") bucket.underReview += 1;
      }
    }

    const result = companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      email: c.email,
      phone: c.phone,
      gstin: c.gstin,
      pan: c.pan,
      address: c.address,
      industry: c.industry,
      logoUrl: c.logoUrl,
      isActive: c.isActive,
      createdAt: c.createdAt,
      totalDocuments: c._count.documents,
      totalUsers: c._count.users,
      totalReports: c._count.reports,
      stats: statsMap.get(c.id) ?? { pending: 0, accepted: 0, rejected: 0, underReview: 0 },
    }));

    // Suppress unused warning – computed for potential future use
    void txGroups;

    return NextResponse.json({ companies: result });
  } catch (err) {
    log.error({ err }, "GET firm companies failed");
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "FIRM_ADMIN") {
      return NextResponse.json({ error: "Only firm admins can add companies" }, { status: 403 });
    }
    if (!session.firmId) {
      return NextResponse.json({ error: "No firm associated" }, { status: 400 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    // Build unique slug
    const base = slugify(data.name) || "company";
    let slug = base;
    let suffix = 1;
    // Try a few candidates
    while (await prisma.company.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
      if (suffix > 50) {
        slug = `${base}-${Date.now()}`;
        break;
      }
    }

    const company = await prisma.company.create({
      data: {
        name: data.name,
        slug,
        email: data.email,
        phone: data.phone || null,
        gstin: data.gstin || null,
        pan: data.pan || null,
        industry: data.industry || null,
        address: data.address || null,
        firmId: session.firmId,
      },
    });

    // Auto-seed payment heads based on industry — saves the accountant from
    // starting with an empty list.
    const template = getTemplateForIndustry(data.industry);
    let headsCreated = 0;
    for (const head of template) {
      const created = await prisma.paymentHead.create({
        data: {
          companyId: company.id,
          name: head.name,
          category: head.category,
          description: head.description ?? null,
        },
      });
      headsCreated += 1;
      if (head.subHeads && head.subHeads.length > 0) {
        await prisma.paymentSubHead.createMany({
          data: head.subHeads.map((name) => ({ paymentHeadId: created.id, name })),
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        action: "COMPANY_CREATED",
        description: `Company "${company.name}" onboarded with ${headsCreated} payment heads (${data.industry ?? "default"} template)`,
        userId: session.userId,
        metadata: { companyId: company.id, firmId: session.firmId, headsCreated, industry: data.industry ?? null },
      },
    });

    log.info({ companyId: company.id, name: company.name, headsCreated }, "Company created");

    return NextResponse.json({ company, paymentHeadsCreated: headsCreated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: err.issues }, { status: 400 });
    }
    log.error({ err }, "POST firm companies failed");
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
