import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { z } from "zod";

const log = apiLogger("/api/payment-heads/[id]");

async function authorizeForHead(headId: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" as const, status: 401, session: null };
  const head = await prisma.paymentHead.findUnique({
    where: { id: headId },
    include: { company: { select: { firmId: true, id: true } } },
  });
  if (!head) return { error: "Payment head not found" as const, status: 404, session };

  const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
  const isCompanyAdmin = session.role === "COMPANY_ADMIN";

  if (isFirm && head.company.firmId !== session.firmId) {
    return { error: "Forbidden" as const, status: 403, session };
  }
  if (isCompanyAdmin && head.companyId !== session.companyId) {
    return { error: "Forbidden" as const, status: 403, session };
  }
  if (!isFirm && !isCompanyAdmin) {
    return { error: "Forbidden" as const, status: 403, session };
  }

  return { head, session, error: null, status: 200 };
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.enum(["INCOME", "EXPENSE"]).optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeForHead(id);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const data = patchSchema.parse(body);

    const updated = await prisma.paymentHead.update({
      where: { id },
      data,
      include: { subHeads: { where: { isActive: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_HEAD_UPDATED",
        description: `Payment head "${updated.name}" updated`,
        userId: auth.session!.userId,
        metadata: { paymentHeadId: id, changes: Object.keys(data) },
      },
    });

    return NextResponse.json({ head: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: err.issues }, { status: 400 });
    }
    log.error({ err }, "PATCH payment head failed");
    return NextResponse.json({ error: "Failed to update payment head" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeForHead(id);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Soft delete
    await prisma.paymentHead.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_HEAD_DELETED",
        description: `Payment head "${auth.head!.name}" deleted`,
        userId: auth.session!.userId,
        metadata: { paymentHeadId: id },
      },
    });

    log.info({ paymentHeadId: id }, "Payment head soft-deleted");
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error({ err }, "DELETE payment head failed");
    return NextResponse.json({ error: "Failed to delete payment head" }, { status: 500 });
  }
}
