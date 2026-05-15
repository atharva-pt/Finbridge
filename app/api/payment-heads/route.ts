import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const log = apiLogger("/api/payment-heads");

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get("companyId");

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    let companyId: string | null = null;

    if (isCompany) {
      if (!session.companyId) {
        return NextResponse.json({ error: "No company associated" }, { status: 400 });
      }
      companyId = session.companyId;
    } else if (isFirm) {
      if (!companyIdParam) {
        return NextResponse.json({ error: "companyId is required for firm users" }, { status: 400 });
      }
      // Verify company belongs to firm
      const company = await prisma.company.findUnique({
        where: { id: companyIdParam },
        select: { firmId: true },
      });
      if (!company || company.firmId !== session.firmId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      companyId = companyIdParam;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const heads = await prisma.paymentHead.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        subHeads: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    return NextResponse.json({ heads });
  } catch (err) {
    log.error({ err }, "GET payment heads failed");
    return NextResponse.json({ error: "Failed to load payment heads" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["INCOME", "EXPENSE"]),
  description: z.string().optional(),
  companyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    let companyId: string | null = null;

    if (isCompany) {
      if (!session.companyId) {
        return NextResponse.json({ error: "No company associated" }, { status: 400 });
      }
      // Company admins only can configure heads
      if (session.role !== "COMPANY_ADMIN") {
        return NextResponse.json({ error: "Only company admins can configure payment heads" }, { status: 403 });
      }
      companyId = session.companyId;
    } else if (isFirm) {
      if (!data.companyId) {
        return NextResponse.json({ error: "companyId is required" }, { status: 400 });
      }
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
        select: { firmId: true },
      });
      if (!company || company.firmId !== session.firmId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      companyId = data.companyId;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const head = await prisma.paymentHead.create({
      data: {
        companyId: companyId!,
        name: data.name,
        category: data.category,
        description: data.description || null,
      },
      include: { subHeads: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_HEAD_CREATED",
        description: `Payment head "${head.name}" created`,
        userId: session.userId,
        metadata: { paymentHeadId: head.id, companyId: head.companyId, category: head.category },
      },
    });

    log.info({ paymentHeadId: head.id, companyId }, "Payment head created");

    return NextResponse.json({ head });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: err.issues }, { status: 400 });
    }
    // Unique violation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (err as any)?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "A payment head with this name already exists" }, { status: 409 });
    }
    log.error({ err }, "POST payment head failed");
    return NextResponse.json({ error: "Failed to create payment head" }, { status: 500 });
  }
}
