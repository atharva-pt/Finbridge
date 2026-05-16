import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, string> = {};
  let overall = "healthy";

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch {
    checks.database = "disconnected";
    overall = "degraded";
  }

  // AI provider checks
  checks.claude = process.env.ANTHROPIC_API_KEY ? "configured" : "missing_key";
  checks.openai = process.env.OPENAI_API_KEY ? "configured" : "missing_key";
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    overall = "degraded";
  }

  // System stats
  let stats = { users: 0, firms: 0, companies: 0, transactions: 0, documents: 0 };
  try {
    const [users, firms, companies, transactions, documents] = await Promise.all([
      prisma.user.count(),
      prisma.accountingFirm.count(),
      prisma.company.count(),
      prisma.transaction.count(),
      prisma.document.count(),
    ]);
    stats = { users, firms, companies, transactions, documents };
  } catch {
    // stats unavailable
  }

  const uptimeMs = Date.now() - startTime;
  const uptimeHours = Math.floor(uptimeMs / 3600000);
  const uptimeMinutes = Math.floor((uptimeMs % 3600000) / 60000);

  return NextResponse.json({
    status: overall,
    version: "1.0.0",
    uptime: `${uptimeHours}h ${uptimeMinutes}m`,
    timestamp: new Date().toISOString(),
    services: {
      database: checks.database,
      ai: {
        claude: checks.claude,
        openai: checks.openai,
      },
    },
    stats,
    environment: process.env.NODE_ENV,
  });
}
