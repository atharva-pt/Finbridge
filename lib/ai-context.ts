import { prisma } from "@/lib/prisma";

interface SessionInfo {
  role: string;
  firmId?: string | null;
  companyId?: string | null;
}

/**
 * Build the financial data context string for AI chat.
 * Shared between Claude and OpenAI chat routes to keep data consistent.
 */
export async function buildAiContext(session: SessionInfo): Promise<string | null> {
  const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
  const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

  if (isFirm && session.firmId) {
    const [transactions, companies, pendingCount, acceptedCount, rejectedCount] =
      await Promise.all([
        prisma.transaction.findMany({
          where: { document: { firmId: session.firmId } },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            vendorName: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            invoiceNumber: true,
            document: { select: { company: { select: { name: true } } } },
          },
        }),
        prisma.company.findMany({
          where: { firmId: session.firmId },
          select: { name: true, isActive: true },
        }),
        prisma.transaction.count({
          where: {
            status: { in: ["PENDING", "UNDER_REVIEW", "NEEDS_INFO"] },
            document: { firmId: session.firmId },
          },
        }),
        prisma.transaction.count({
          where: {
            status: "ACCEPTED",
            document: { firmId: session.firmId },
          },
        }),
        prisma.transaction.count({
          where: {
            status: "REJECTED",
            document: { firmId: session.firmId },
          },
        }),
      ]);

    const acceptedAmount = transactions
      .filter((t) => t.status === "ACCEPTED")
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const pendingAmount = transactions
      .filter((t) => ["PENDING", "UNDER_REVIEW", "NEEDS_INFO"].includes(t.status))
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    return `You are a financial assistant for an accounting firm on FinBridge. Here is the current data:

Total transactions: ${transactions.length}
Pending/In-Review transactions: ${pendingCount}
Accepted transactions: ${acceptedCount}
Rejected transactions: ${rejectedCount}
Total accepted amount: ₹${acceptedAmount.toLocaleString("en-IN")}
Pending amount (awaiting review): ₹${pendingAmount.toLocaleString("en-IN")}
Companies managed: ${companies.map((c) => `${c.name} (${c.isActive ? "active" : "inactive"})`).join(", ") || "None"}

Recent transactions (with their CURRENT status):
${
  transactions
    .map(
      (t) =>
        `- ${t.vendorName || "Unknown vendor"}: ₹${(t.totalAmount || 0).toLocaleString("en-IN")} (Status: ${t.status}) from ${t.document.company.name} [Invoice: ${t.invoiceNumber || "N/A"}] on ${t.createdAt.toLocaleDateString("en-IN")}`,
    )
    .join("\n") || "No transactions found"
}`;
  }

  if (isCompany && session.companyId) {
    const [transactions, pendingCount, acceptedCount, rejectedCount, documents] =
      await Promise.all([
        prisma.transaction.findMany({
          where: { document: { companyId: session.companyId } },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            vendorName: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            invoiceNumber: true,
            description: true,
          },
        }),
        prisma.transaction.count({
          where: {
            status: { in: ["PENDING", "UNDER_REVIEW", "NEEDS_INFO"] },
            document: { companyId: session.companyId },
          },
        }),
        prisma.transaction.count({
          where: {
            status: "ACCEPTED",
            document: { companyId: session.companyId },
          },
        }),
        prisma.transaction.count({
          where: {
            status: "REJECTED",
            document: { companyId: session.companyId },
          },
        }),
        prisma.document.count({
          where: { companyId: session.companyId },
        }),
      ]);

    const acceptedSpending = transactions
      .filter((t) => t.status === "ACCEPTED")
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const pendingAmount = transactions
      .filter((t) => ["PENDING", "UNDER_REVIEW", "NEEDS_INFO"].includes(t.status))
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    return `You are a financial assistant for a company on FinBridge. Here is the current data:

Total documents uploaded: ${documents}
Total transactions: ${transactions.length}
Pending/In-Review transactions: ${pendingCount}
Accepted transactions: ${acceptedCount}
Rejected transactions: ${rejectedCount}
Total accepted spending: ₹${acceptedSpending.toLocaleString("en-IN")}
Pending amount (awaiting review): ₹${pendingAmount.toLocaleString("en-IN")}

Recent transactions (with their CURRENT status):
${
  transactions
    .map(
      (t) =>
        `- ${t.vendorName || "Unknown vendor"}: ₹${(t.totalAmount || 0).toLocaleString("en-IN")} (Status: ${t.status}) [Invoice: ${t.invoiceNumber || "N/A"}] on ${t.createdAt.toLocaleDateString("en-IN")}`,
    )
    .join("\n") || "No transactions found"
}`;
  }

  return null;
}

export const AI_SYSTEM_SUFFIX = `

IMPORTANT INSTRUCTIONS:
- You are FinBridge AI, a helpful financial assistant.
- Answer questions based ONLY on the data provided above.
- Be concise, professional, and use Indian Rupee (₹) formatting.
- If the data doesn't contain enough information to answer, say so honestly.
- Format numbers with Indian comma separators (e.g., ₹1,23,456).
- When summarizing, use bullet points for clarity.
- Do NOT make up data that isn't in the context above.
- Keep responses under 300 words unless the user asks for detail.
- Be friendly and use a conversational tone.
- Pay close attention to transaction STATUS — only count ACCEPTED transactions as completed spending. PENDING/UNDER_REVIEW/NEEDS_INFO are still awaiting approval.`;
