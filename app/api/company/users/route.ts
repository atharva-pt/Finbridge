import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";

const log = apiLogger("/api/company/users");

export async function GET(req: NextRequest) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
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
        return NextResponse.json({ error: "companyId is required" }, { status: 400 });
      }
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

    const users = await prisma.user.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (err) {
    log.error({ err }, "GET company users failed");
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
