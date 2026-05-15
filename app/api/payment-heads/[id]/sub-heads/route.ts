import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const log = apiLogger("/api/payment-heads/[id]/sub-heads");

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const head = await prisma.paymentHead.findUnique({
      where: { id },
      include: { company: { select: { firmId: true } } },
    });
    if (!head) {
      return NextResponse.json({ error: "Payment head not found" }, { status: 404 });
    }

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompanyAdmin = session.role === "COMPANY_ADMIN";

    if (isFirm && head.company.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isCompanyAdmin && head.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isFirm && !isCompanyAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = createSchema.parse(body);

    const subHead = await prisma.paymentSubHead.create({
      data: {
        paymentHeadId: id,
        name: data.name,
        description: data.description || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_SUB_HEAD_CREATED",
        description: `Sub-head "${subHead.name}" added under "${head.name}"`,
        userId: session.userId,
        metadata: { paymentHeadId: id, subHeadId: subHead.id },
      },
    });

    log.info({ subHeadId: subHead.id, paymentHeadId: id }, "Sub-head created");

    return NextResponse.json({ subHead });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: err.issues }, { status: 400 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const code = (err as any)?.code;
    if (code === "P2002") {
      return NextResponse.json({ error: "A sub-head with this name already exists" }, { status: 409 });
    }
    log.error({ err }, "POST sub-head failed");
    return NextResponse.json({ error: "Failed to create sub-head" }, { status: 500 });
  }
}
