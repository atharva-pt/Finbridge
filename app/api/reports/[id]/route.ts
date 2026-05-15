import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { unlink } from "fs/promises";

const log = apiLogger("/api/reports/[id]");

async function authorize(id: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" as const, status: 401, session: null, report: null };

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      company: { select: { firmId: true, id: true, name: true } },
    },
  });
  if (!report) return { error: "Report not found" as const, status: 404, session, report: null };

  const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
  const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

  if (isFirm && report.company.firmId !== session.firmId) {
    return { error: "Forbidden" as const, status: 403, session, report: null };
  }
  if (isCompany && report.companyId !== session.companyId) {
    return { error: "Forbidden" as const, status: 403, session, report: null };
  }
  if (!isFirm && !isCompany) {
    return { error: "Forbidden" as const, status: 403, session, report: null };
  }

  return { error: null, status: 200, session, report };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const uploader = await prisma.user.findUnique({
      where: { id: auth.report!.uploadedById },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json({ report: { ...auth.report, uploadedBy: uploader } });
  } catch (err) {
    log.error({ err }, "GET report failed");
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    // Only firm admin/accountant can delete
    if (!["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(auth.session!.role)) {
      return NextResponse.json({ error: "Only firm users can delete reports" }, { status: 403 });
    }

    // Attempt to remove file from disk (best-effort)
    try {
      await unlink(auth.report!.filePath);
    } catch (e) {
      log.warn({ err: e, filePath: auth.report!.filePath }, "Failed to unlink report file (best-effort)");
    }

    await prisma.report.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        action: "REPORT_DELETED",
        description: `Report "${auth.report!.title}" deleted`,
        userId: auth.session!.userId,
        metadata: { reportId: id, companyId: auth.report!.companyId },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error({ err }, "DELETE report failed");
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
