import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";

const log = apiLogger("/api/firm/team");

export async function GET() {
  try {
    const { session, error, status } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status });
    }
    if (!["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!session.firmId) {
      return NextResponse.json({ error: "No firm associated" }, { status: 400 });
    }

    const users = await prisma.user.findMany({
      where: {
        firmId: session.firmId,
        role: { in: ["FIRM_ADMIN", "FIRM_ACCOUNTANT"] },
      },
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
    log.error({ err }, "GET firm team failed");
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}
