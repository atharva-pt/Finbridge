import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

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

    const document = await prisma.document.findUnique({
      where: { id },
      select: {
        filePath: true,
        mimeType: true,
        fileName: true,
        firmId: true,
        companyId: true,
      },
    });

    if (!document) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Tenant isolation
    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    if (isFirm && document.firmId !== session.firmId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (isCompany && document.companyId !== session.companyId) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const fileBuffer = await readFile(document.filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${document.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("File serve error:", err);
    return new NextResponse("Failed to serve file", { status: 500 });
  }
}
