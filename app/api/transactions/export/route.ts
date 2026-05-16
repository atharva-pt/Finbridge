import { NextRequest } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const querySchema = z.object({
  format: z.enum(["csv", "tally"]).default("csv"),
  status: z.enum(["PENDING", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "NEEDS_INFO"]).optional(),
  search: z.string().optional(),
});

function escapeCSV(value: string): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function buildCSV(
  transactions: Array<{
    createdAt: Date;
    vendorName: string | null;
    invoiceNumber: string | null;
    amount: number | null;
    taxAmount: number | null;
    totalAmount: number | null;
    status: string;
    document: {
      originalName: string;
      documentType: string;
      company: { name: string };
    };
  }>
): string {
  const headers = [
    "Date",
    "Document Name",
    "Vendor",
    "Invoice Number",
    "Amount",
    "Tax",
    "Total",
    "Status",
    "Document Type",
    "Company Name",
  ];

  const rows = transactions.map((tx) => [
    escapeCSV(formatDate(tx.createdAt)),
    escapeCSV(tx.document.originalName),
    escapeCSV(tx.vendorName ?? ""),
    escapeCSV(tx.invoiceNumber ?? ""),
    tx.amount != null ? String(tx.amount) : "",
    tx.taxAmount != null ? String(tx.taxAmount) : "",
    tx.totalAmount != null ? String(tx.totalAmount) : "",
    escapeCSV(tx.status),
    escapeCSV(tx.document.documentType),
    escapeCSV(tx.document.company?.name ?? ""),
  ]);

  return [headers.map(escapeCSV).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

function buildTallyXML(
  transactions: Array<{
    createdAt: Date;
    invoiceDate: Date | null;
    vendorName: string | null;
    invoiceNumber: string | null;
    amount: number | null;
    taxAmount: number | null;
    totalAmount: number | null;
    document: {
      originalName: string;
      company: { name: string };
    };
  }>
): string {
  const vouchers = transactions
    .map((tx) => {
      const date = tx.invoiceDate ?? tx.createdAt;
      const tallyDate = (() => {
        const d = new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}${m}${day}`;
      })();
      const partyName = tx.vendorName || tx.document.company?.name || "Unknown";
      const amount = tx.totalAmount ?? tx.amount ?? 0;
      const ref = tx.invoiceNumber || tx.document.originalName;

      return `<VOUCHER VCHTYPE="Purchase" ACTION="Create">
<DATE>${tallyDate}</DATE>
<NARRATION>${escapeXML(ref)}</NARRATION>
<VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
<PARTYLEDGERNAME>${escapeXML(partyName)}</PARTYLEDGERNAME>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${escapeXML(partyName)}</LEDGERNAME>
<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
<AMOUNT>${amount}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>Purchase Account</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>-${amount}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER>`;
    })
    .join("\n");

  return `<ENVELOPE>
<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
<BODY><IMPORTDATA>
<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC>
<REQUESTDATA>
<TALLYMESSAGE xmlns:UDF="TallyUDF">
${vouchers}
</TALLYMESSAGE>
</REQUESTDATA>
</IMPORTDATA></BODY>
</ENVELOPE>`;
}

function escapeXML(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(req: NextRequest) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return Response.json(error, { status: authStatus });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      format: searchParams.get("format") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const format = parsed.data.format;
    const statusParam = parsed.data.status ?? null;
    const searchQuery = parsed.data.search ?? null;

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (statusParam) {
      where.status = statusParam;
    }

    if (isFirm) {
      if (!session.firmId) {
        return Response.json({ error: "No firm associated" }, { status: 400 });
      }
      where.document = { firmId: session.firmId };
    } else if (isCompany) {
      if (!session.companyId) {
        return Response.json({ error: "No company associated" }, { status: 400 });
      }
      where.document = { companyId: session.companyId };
    } else {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (searchQuery) {
      where.OR = [
        { vendorName: { contains: searchQuery, mode: "insensitive" } },
        { document: { ...where.document, originalName: { contains: searchQuery, mode: "insensitive" } } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: {
            originalName: true,
            documentType: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    const today = new Date().toISOString().split("T")[0];

    if (format === "tally") {
      const xml = buildTallyXML(transactions);
      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml",
          "Content-Disposition": `attachment; filename="finbridge-tally-${today}.xml"`,
        },
      });
    }

    // Default: CSV
    const csv = buildCSV(transactions);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="finbridge-transactions-${today}.csv"`,
      },
    });
  } catch (err) {
    console.error("Transaction export error:", err);
    return Response.json({ error: "Failed to export transactions" }, { status: 500 });
  }
}
