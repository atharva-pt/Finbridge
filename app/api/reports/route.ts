import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiLogger } from "@/lib/logger";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const log = apiLogger("/api/reports");

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "text/csv",
]);

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (isCompany) {
      if (!session.companyId) {
        return NextResponse.json({ error: "No company associated" }, { status: 400 });
      }
      where.companyId = session.companyId;
    } else if (isFirm) {
      if (!session.firmId) {
        return NextResponse.json({ error: "No firm associated" }, { status: 400 });
      }
      where.company = { firmId: session.firmId };
      if (companyIdParam) {
        where.companyId = companyIdParam;
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    // Fetch uploader info separately (Report doesn't relate to User in schema)
    const uploaderIds = Array.from(new Set(reports.map((r) => r.uploadedById)));
    const uploaders = uploaderIds.length
      ? await prisma.user.findMany({
          where: { id: { in: uploaderIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const uploaderMap = new Map(uploaders.map((u) => [u.id, u]));

    const enriched = reports.map((r) => ({
      ...r,
      uploadedBy: uploaderMap.get(r.uploadedById) ?? null,
    }));

    return NextResponse.json({ reports: enriched });
  } catch (err) {
    log.error({ err }, "GET reports failed");
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only firm users can upload reports
    if (!["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role)) {
      return NextResponse.json({ error: "Only firm accountants can upload reports" }, { status: 403 });
    }
    if (!session.firmId) {
      return NextResponse.json({ error: "No firm associated" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const companyId = formData.get("companyId") as string | null;
    const title = formData.get("title") as string | null;
    const reportType = (formData.get("reportType") as string) || "MIS";
    const period = (formData.get("period") as string) || null;
    const description = (formData.get("description") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Allowed: PDF, Excel, Word, CSV, JPG, PNG." },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
    }

    // Verify company belongs to this firm
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { firmId: true },
    });
    if (!company || company.firmId !== session.firmId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Persist file
    const fileId = randomUUID();
    const ext = path.extname(file.name) || "";
    const safeFileName = `${fileId}${ext}`;
    const uploadDir = path.join(process.cwd(), "uploads", "reports", session.firmId, companyId);
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeFileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    log.info({ filePath, size: file.size, companyId }, "Report file saved");

    const report = await prisma.report.create({
      data: {
        companyId,
        uploadedById: session.userId,
        title,
        reportType,
        period,
        description,
        fileName: file.name,
        filePath,
        fileSize: file.size,
        mimeType: file.type,
      },
      include: { company: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        action: "REPORT_UPLOADED",
        description: `Report "${title}" uploaded for ${report.company.name}`,
        userId: session.userId,
        metadata: { reportId: report.id, companyId, reportType, period },
      },
    });

    log.info({ reportId: report.id }, "Report record created");

    return NextResponse.json({ report });
  } catch (err) {
    log.error({ err }, "POST report failed");
    return NextResponse.json({ error: "Failed to upload report" }, { status: 500 });
  }
}
