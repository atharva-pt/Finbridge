import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { readFile } from "fs/promises";

const log = apiLogger("/api/reports/[id]/download");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id } = await params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: { company: { select: { firmId: true } } },
    });
    if (!report) {
      return new NextResponse("Not found", { status: 404 });
    }

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    if (isFirm && report.company.firmId !== session.firmId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (isCompany && report.companyId !== session.companyId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (!isFirm && !isCompany) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(report.filePath);
    } catch (e) {
      log.warn({ err: e, reportId: id, filePath: report.filePath }, "Report file missing on disk");
      return new NextResponse("File missing on server", { status: 410 });
    }

    // Use ASCII-safe filename for Content-Disposition; provide UTF-8 fallback
    const safeName = report.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    const encoded = encodeURIComponent(report.fileName);

    log.info({ reportId: id, size: fileBuffer.length }, "Report downloaded");

    // Use Uint8Array for body to satisfy BodyInit typing on newer Next/runtime
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": report.mimeType,
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encoded}`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    log.error({ err }, "Report download failed");
    return new NextResponse("Download failed", { status: 500 });
  }
}
