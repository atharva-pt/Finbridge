import { type NextRequest } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";
import { z } from "zod";

const querySchema = z.object({
  period: z.enum(["last7", "last30", "last90", "all"]).default("last30"),
});

const ALLOWED_ROLES = ["FIRM_ADMIN", "FIRM_ACCOUNTANT", "COMPANY_ADMIN", "COMPANY_USER"];

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: NextRequest) {
  try {
    const { session, error, status } = await validateActiveSession();
    if (!session) return Response.json(error, { status });

    if (!ALLOWED_ROLES.includes(session.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = querySchema.safeParse({
      period: req.nextUrl.searchParams.get("period") ?? undefined,
    });
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const { period } = parsed.data;

    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "last7":
        startDate = startOfDay(subDays(now, 7));
        break;
      case "last90":
        startDate = startOfDay(subDays(now, 90));
        break;
      case "all":
        startDate = new Date("2020-01-01");
        break;
      default:
        startDate = startOfDay(subDays(now, 30));
    }

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const whereClause = isFirm
      ? { document: { firmId: session.firmId! } }
      : { document: { companyId: session.companyId! } };

    const transactions = await prisma.transaction.findMany({
      where: {
        ...whereClause,
        status: "ACCEPTED",
        acceptedAt: { gte: startDate, lte: now },
      },
      include: {
        document: {
          select: {
            documentType: true,
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { acceptedAt: "desc" },
    });

    // Build CSV header
    const headers = isFirm
      ? ["Date", "Vendor", "Invoice Number", "Document Type", "Amount", "Tax", "Total", "Status", "Company"]
      : ["Date", "Vendor", "Invoice Number", "Document Type", "Amount", "Tax", "Total", "Status"];

    const rows = transactions.map((tx) => {
      const row = [
        tx.invoiceDate ? format(new Date(tx.invoiceDate), "yyyy-MM-dd") : "",
        tx.vendorName ?? "",
        tx.invoiceNumber ?? "",
        tx.document.documentType ?? "",
        tx.amount != null ? tx.amount.toFixed(2) : "",
        tx.taxAmount != null ? tx.taxAmount.toFixed(2) : "",
        tx.totalAmount != null ? tx.totalAmount.toFixed(2) : "",
        tx.status,
      ];
      if (isFirm) {
        row.push(tx.document.company.name);
      }
      return row.map(escapeCsvField).join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const dateStr = format(now, "yyyy-MM-dd");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="finbridge-report-${dateStr}.csv"`,
      },
    });
  } catch (err) {
    console.error("CSV export error:", err);
    return Response.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
