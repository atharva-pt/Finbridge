import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "NEEDS_INFO"]).optional(),
  companyId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      companyId: searchParams.get("companyId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const statusParam = parsed.data.status ?? null;
    const companyIdParam = parsed.data.companyId ?? null;

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    // Build where clause with tenant isolation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (statusParam) {
      where.status = statusParam;
    }

    if (isFirm) {
      // Firm can see all companies under their firm
      if (!session.firmId) {
        return NextResponse.json({ error: "No firm associated" }, { status: 400 });
      }
      where.document = {
        firmId: session.firmId,
        ...(companyIdParam ? { companyId: companyIdParam } : {}),
      };
    } else if (isCompany) {
      // Company users see only their own uploaded documents' transactions
      if (!session.companyId) {
        return NextResponse.json({ error: "No company associated" }, { status: 400 });
      }
      where.document = {
        companyId: session.companyId,
        uploadedById: session.userId,
      };
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: {
            id: true,
            originalName: true,
            documentType: true,
            mimeType: true,
            uploadedAt: true,
            company: { select: { id: true, name: true, slug: true } },
            uploadedBy: { select: { name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("Transactions list error:", err);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
