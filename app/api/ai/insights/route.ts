import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple in-memory cache with 5-minute TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

const DEFAULT_INSIGHTS = [
  {
    icon: "sparkle",
    title: "Get Started Today",
    description:
      "Upload your first invoice to unlock AI-powered financial insights and analytics.",
    type: "neutral",
  },
  {
    icon: "trend-up",
    title: "Track Spending Trends",
    description:
      "Once you have transactions, we'll analyze spending patterns and highlight key trends.",
    type: "positive",
  },
  {
    icon: "check",
    title: "Automate Reviews",
    description:
      "AI extraction saves hours of manual data entry — start by uploading a document.",
    type: "positive",
  },
  {
    icon: "clock",
    title: "Real-Time Monitoring",
    description:
      "As data flows in, you'll see live alerts on anomalies, due dates, and approval bottlenecks.",
    type: "neutral",
  },
];

export async function GET() {
  try {
    const { session, error, status } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status });
    }

    // Build cache key from user identity
    const cacheKey = `insights:${session.userId}:${session.role}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ insights: cached });
    }

    const isFirmRole = session.role === "FIRM_ADMIN" || session.role === "FIRM_ACCOUNTANT";
    const isCompanyRole = session.role === "COMPANY_ADMIN" || session.role === "COMPANY_USER";

    let dataSummary = "";

    if (isFirmRole && session.firmId) {
      // Firm-level data queries
      const [statusCounts, topVendors, weekActivity, companyCount] =
        await Promise.all([
          prisma.transaction.groupBy({
            by: ["status"],
            where: { document: { firmId: session.firmId } },
            _count: { id: true },
          }),
          prisma.transaction.groupBy({
            by: ["vendorName"],
            where: {
              document: { firmId: session.firmId },
              vendorName: { not: null },
              totalAmount: { not: null },
            },
            _sum: { totalAmount: true },
            orderBy: { _sum: { totalAmount: "desc" } },
            take: 5,
          }),
          prisma.transaction.count({
            where: {
              document: { firmId: session.firmId },
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          }),
          prisma.company.count({
            where: { firmId: session.firmId, isActive: true },
          }),
        ]);

      const prevWeekActivity = await prisma.transaction.count({
        where: {
          document: { firmId: session.firmId },
          createdAt: {
            gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });

      const totalTransactions = statusCounts.reduce(
        (sum, s) => sum + s._count.id,
        0
      );

      if (totalTransactions === 0) {
        setCache(cacheKey, DEFAULT_INSIGHTS);
        return NextResponse.json({ insights: DEFAULT_INSIGHTS });
      }

      const statusBreakdown = statusCounts
        .map((s) => `${s.status}: ${s._count.id}`)
        .join(", ");
      const vendorBreakdown = topVendors
        .map(
          (v) =>
            `${v.vendorName}: ₹${(v._sum.totalAmount ?? 0).toLocaleString("en-IN")}`
        )
        .join(", ");
      const wowChange =
        prevWeekActivity > 0
          ? (
              ((weekActivity - prevWeekActivity) / prevWeekActivity) *
              100
            ).toFixed(1)
          : "N/A";

      dataSummary = `Firm dashboard data:
- Total transactions: ${totalTransactions}
- Status breakdown: ${statusBreakdown}
- Top vendors by spend: ${vendorBreakdown}
- This week's transactions: ${weekActivity}, last week: ${prevWeekActivity}, WoW change: ${wowChange}%
- Active companies: ${companyCount}`;
    } else if (isCompanyRole && session.companyId) {
      // Company-level data queries
      const [statusCounts, topVendors, recentTx] = await Promise.all([
        prisma.transaction.groupBy({
          by: ["status"],
          where: { document: { companyId: session.companyId } },
          _count: { id: true },
        }),
        prisma.transaction.groupBy({
          by: ["vendorName"],
          where: {
            document: { companyId: session.companyId },
            vendorName: { not: null },
            totalAmount: { not: null },
          },
          _sum: { totalAmount: true },
          orderBy: { _sum: { totalAmount: "desc" } },
          take: 5,
        }),
        prisma.transaction.findMany({
          where: { document: { companyId: session.companyId } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { totalAmount: true, status: true, createdAt: true },
        }),
      ]);

      const totalTransactions = statusCounts.reduce(
        (sum, s) => sum + s._count.id,
        0
      );

      if (totalTransactions === 0) {
        setCache(cacheKey, DEFAULT_INSIGHTS);
        return NextResponse.json({ insights: DEFAULT_INSIGHTS });
      }

      const pendingCount =
        statusCounts.find((s) => s.status === "PENDING")?._count.id ?? 0;
      const completedCount =
        statusCounts.find((s) => s.status === "ACCEPTED")?._count.id ?? 0;
      const statusBreakdown = statusCounts
        .map((s) => `${s.status}: ${s._count.id}`)
        .join(", ");
      const vendorBreakdown = topVendors
        .map(
          (v) =>
            `${v.vendorName}: ₹${(v._sum.totalAmount ?? 0).toLocaleString("en-IN")}`
        )
        .join(", ");
      const totalSpend = recentTx.reduce(
        (sum, t) => sum + (t.totalAmount ?? 0),
        0
      );

      dataSummary = `Company dashboard data:
- Total transactions: ${totalTransactions}
- Status breakdown: ${statusBreakdown}
- Pending: ${pendingCount}, Completed: ${completedCount}, Ratio: ${completedCount > 0 ? (pendingCount / completedCount).toFixed(2) : "N/A"}
- Top vendors by spend: ${vendorBreakdown}
- Recent 20 transactions total spend: ₹${totalSpend.toLocaleString("en-IN")}`;
    } else {
      // Fallback for admin or unknown roles
      setCache(cacheKey, DEFAULT_INSIGHTS);
      return NextResponse.json({ insights: DEFAULT_INSIGHTS });
    }

    // Call Claude to generate insights
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a financial analyst. Based on this data, generate exactly 4 short, actionable insights. Each insight should be JSON with: { "icon": "trend-up"|"trend-down"|"alert"|"sparkle"|"check"|"clock", "title": "Short title (max 6 words)", "description": "One sentence insight", "type": "positive"|"negative"|"neutral"|"warning" }
Return a JSON array of exactly 4 insights. Return ONLY the JSON array, no other text.

${dataSummary}`,
        },
      ],
    });

    // Extract text from response
    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock?.text ?? "[]";

    // Parse JSON — handle markdown code fences
    const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    let insights;
    try {
      insights = JSON.parse(jsonStr);
    } catch {
      insights = DEFAULT_INSIGHTS;
    }

    // Validate structure
    if (!Array.isArray(insights) || insights.length !== 4) {
      insights = DEFAULT_INSIGHTS;
    }

    setCache(cacheKey, insights);
    return NextResponse.json({ insights });
  } catch (err) {
    console.error("[AI Insights] Error:", err);
    return NextResponse.json({ insights: DEFAULT_INSIGHTS });
  }
}
