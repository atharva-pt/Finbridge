import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";

const log = apiLogger("/api/payment-heads/sub-heads/[id]");

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const subHead = await prisma.paymentSubHead.findUnique({
      where: { id },
      include: {
        paymentHead: {
          include: { company: { select: { firmId: true, id: true } } },
        },
      },
    });
    if (!subHead) {
      return NextResponse.json({ error: "Sub-head not found" }, { status: 404 });
    }

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompanyAdmin = session.role === "COMPANY_ADMIN";

    if (isFirm && subHead.paymentHead.company.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isCompanyAdmin && subHead.paymentHead.companyId !== session.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isFirm && !isCompanyAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.paymentSubHead.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_SUB_HEAD_DELETED",
        description: `Sub-head "${subHead.name}" removed`,
        userId: session.userId,
        metadata: { subHeadId: id, paymentHeadId: subHead.paymentHeadId },
      },
    });

    log.info({ subHeadId: id }, "Sub-head deleted");
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error({ err }, "DELETE sub-head failed");
    return NextResponse.json({ error: "Failed to delete sub-head" }, { status: 500 });
  }
}
