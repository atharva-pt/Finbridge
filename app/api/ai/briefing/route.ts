import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple in-memory cache — briefing is expensive, cache for 10 minutes
const cache = new Map<string, { data: string; expiresAt: number }>();
const CACHE_TTL = 10 * 60 * 1000;

export async function GET() {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }

    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    if (!isFirm && !isCompany) {
      return NextResponse.json({ briefing: null });
    }

    const cacheKey = `briefing:${session.userId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({ briefing: cached.data, cached: true });
    }

    // Build context data
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoDaysAgo = new Date(todayStart.getTime() - 48 * 60 * 60 * 1000);

    let context = "";

    if (isFirm && session.firmId) {
      const [
        totalPending,
        totalAccepted,
        todayUploads,
        todayAccepted,
        overdueCount,
        recentTransactions,
        anomalyTransactions,
        companies,
      ] = await Promise.all([
        prisma.transaction.count({
          where: { status: { in: ["PENDING", "UNDER_REVIEW", "NEEDS_INFO"] }, document: { firmId: session.firmId } },
        }),
        prisma.transaction.count({
          where: { status: "ACCEPTED", document: { firmId: session.firmId } },
        }),
        prisma.transaction.count({
          where: { createdAt: { gte: todayStart }, document: { firmId: session.firmId } },
        }),
        prisma.transaction.count({
          where: { status: "ACCEPTED", updatedAt: { gte: todayStart }, document: { firmId: session.firmId } },
        }),
        prisma.transaction.count({
          where: {
            status: { in: ["PENDING", "UNDER_REVIEW"] },
            createdAt: { lt: twoDaysAgo },
            document: { firmId: session.firmId },
          },
        }),
        prisma.transaction.findMany({
          where: { document: { firmId: session.firmId } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            vendorName: true,
            totalAmount: true,
            status: true,
            confidenceScore: true,
            createdAt: true,
            document: { select: { company: { select: { name: true } } } },
          },
        }),
        prisma.transaction.findMany({
          where: {
            confidenceScore: { lt: 0.7 },
            status: { in: ["PENDING", "UNDER_REVIEW"] },
            document: { firmId: session.firmId },
          },
          take: 5,
          select: { vendorName: true, totalAmount: true, confidenceScore: true },
        }),
        prisma.company.count({ where: { firmId: session.firmId, isActive: true } }),
      ]);

      const totalPendingAmount = recentTransactions
        .filter((t) => ["PENDING", "UNDER_REVIEW", "NEEDS_INFO"].includes(t.status))
        .reduce((s, t) => s + (t.totalAmount || 0), 0);

      const todayTotalAmount = recentTransactions
        .filter((t) => new Date(t.createdAt) >= todayStart)
        .reduce((s, t) => s + (t.totalAmount || 0), 0);

      // Top vendor by volume
      const vendorCounts: Record<string, number> = {};
      for (const t of recentTransactions) {
        if (t.vendorName) vendorCounts[t.vendorName] = (vendorCounts[t.vendorName] || 0) + 1;
      }
      const topVendor = Object.entries(vendorCounts).sort((a, b) => b[1] - a[1])[0];

      context = `Role: Accounting Firm Dashboard
Active companies: ${companies}
Today's new uploads: ${todayUploads}
Today's approved: ${todayAccepted}
Today's total upload value: ₹${todayTotalAmount.toLocaleString("en-IN")}
Total pending review: ${totalPending} (worth ₹${totalPendingAmount.toLocaleString("en-IN")})
Total accepted all-time: ${totalAccepted}
Overdue transactions (pending >48h): ${overdueCount}
Low confidence transactions pending: ${anomalyTransactions.length}
${anomalyTransactions.length > 0 ? `Low confidence details: ${anomalyTransactions.map((t) => `${t.vendorName || "Unknown"} (₹${(t.totalAmount || 0).toLocaleString("en-IN")}, confidence: ${((t.confidenceScore || 0) * 100).toFixed(0)}%)`).join(", ")}` : ""}
${topVendor ? `Most active vendor recently: ${topVendor[0]} (${topVendor[1]} transactions)` : ""}`;
    } else if (isCompany && session.companyId) {
      const [totalPending, totalAccepted, totalRejected, recentTx] = await Promise.all([
        prisma.transaction.count({
          where: { status: { in: ["PENDING", "UNDER_REVIEW"] }, document: { companyId: session.companyId } },
        }),
        prisma.transaction.count({
          where: { status: "ACCEPTED", document: { companyId: session.companyId } },
        }),
        prisma.transaction.count({
          where: { status: "REJECTED", document: { companyId: session.companyId } },
        }),
        prisma.transaction.findMany({
          where: { document: { companyId: session.companyId } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { vendorName: true, totalAmount: true, status: true, createdAt: true },
        }),
      ]);

      const pendingAmount = recentTx
        .filter((t) => ["PENDING", "UNDER_REVIEW"].includes(t.status))
        .reduce((s, t) => s + (t.totalAmount || 0), 0);

      context = `Role: Company Dashboard
Pending review: ${totalPending} (worth ₹${pendingAmount.toLocaleString("en-IN")})
Accepted: ${totalAccepted}
Rejected: ${totalRejected}
Recent transactions: ${recentTx.map((t) => `${t.vendorName || "Unknown"}: ₹${(t.totalAmount || 0).toLocaleString("en-IN")} (${t.status})`).join("; ")}`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are FinBridge AI, a financial assistant. Based on this dashboard data, write a brief morning briefing (3-4 sentences max). Be specific with numbers. Mention anything urgent (overdue items, low confidence extractions, anomalies). Use ₹ for amounts with Indian formatting. Be conversational but professional. No bullet points — write flowing prose. Do NOT use markdown.

${context}`,
        },
      ],
    });

    const briefing =
      response.content[0].type === "text" ? response.content[0].text : "Unable to generate briefing.";

    cache.set(cacheKey, { data: briefing, expiresAt: Date.now() + CACHE_TTL });

    return NextResponse.json({ briefing, cached: false });
  } catch (err) {
    console.error("Briefing error:", err);
    return NextResponse.json(
      { briefing: null, error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
