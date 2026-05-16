import { NextRequest, NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SearchResult {
  type: "transaction" | "company" | "page";
  id: string;
  title: string;
  subtitle: string;
  url: string;
  icon: string;
}

const FIRM_PAGES = [
  { title: "Dashboard", url: "/firm", aliases: ["home", "overview"] },
  { title: "Transactions", url: "/firm/transactions", aliases: ["invoices", "review"] },
  { title: "Companies", url: "/firm/companies", aliases: ["clients"] },
  { title: "Team", url: "/firm/team", aliases: ["members", "people"] },
  { title: "Reports", url: "/firm/reports", aliases: ["export", "csv"] },
  { title: "Audit Logs", url: "/firm/audit", aliases: ["logs", "history"] },
];

const COMPANY_PAGES = [
  { title: "Dashboard", url: "/company", aliases: ["home", "overview"] },
  { title: "Upload", url: "/company/upload", aliases: ["invoice", "document"] },
  { title: "Transactions", url: "/company/transactions", aliases: ["invoices", "review"] },
  { title: "Reports", url: "/company/reports", aliases: ["export", "csv"] },
  { title: "Settings", url: "/company/settings", aliases: ["payment heads", "profile"] },
];

export async function GET(request: NextRequest) {
  try {
    const { session, error, status } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status });
    }

    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const isFirmUser = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const results: SearchResult[] = [];

    // Search transactions (limit 5)
    const transactionWhere = isFirmUser
      ? { document: { firmId: session.firmId! } }
      : { document: { companyId: session.companyId! } };

    const transactions = await prisma.transaction.findMany({
      where: {
        ...transactionWhere,
        OR: [
          { vendorName: { contains: q, mode: "insensitive" as const } },
          { invoiceNumber: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        vendorName: true,
        invoiceNumber: true,
        totalAmount: true,
        currency: true,
        document: { select: { companyId: true } },
      },
    });

    for (const tx of transactions) {
      const title = tx.vendorName || tx.invoiceNumber || "Transaction";
      const subtitle = tx.invoiceNumber
        ? `${tx.invoiceNumber}${tx.totalAmount ? ` — ${tx.currency} ${tx.totalAmount.toLocaleString()}` : ""}`
        : tx.totalAmount
          ? `${tx.currency} ${tx.totalAmount.toLocaleString()}`
          : "No amount";
      const baseUrl = isFirmUser ? "/firm/transactions" : "/company/transactions";
      results.push({
        type: "transaction",
        id: tx.id,
        title,
        subtitle,
        url: `${baseUrl}?highlight=${tx.id}`,
        icon: "FileText",
      });
    }

    // Search companies (firm users only, limit 3)
    if (isFirmUser && session.firmId) {
      const companies = await prisma.company.findMany({
        where: {
          firmId: session.firmId,
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        },
        take: 3,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          slug: true,
        },
      });

      for (const company of companies) {
        results.push({
          type: "company",
          id: company.id,
          title: company.name,
          subtitle: company.email,
          url: `/firm/companies/${company.slug}`,
          icon: "Building2",
        });
      }
    }

    // Search pages (limit 2)
    const pages = isFirmUser ? FIRM_PAGES : COMPANY_PAGES;
    const lowerQ = q.toLowerCase();
    const matchedPages = pages
      .filter(
        (page) =>
          page.title.toLowerCase().includes(lowerQ) ||
          page.aliases.some((alias) => alias.toLowerCase().includes(lowerQ))
      )
      .slice(0, 2);

    for (const page of matchedPages) {
      results.push({
        type: "page",
        id: page.url,
        title: page.title,
        subtitle: page.url,
        url: page.url,
        icon: "ArrowRight",
      });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[search] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
