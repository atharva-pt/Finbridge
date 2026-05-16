import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid message", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { message } = parsed.data;
    const isFirm = ["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role);
    const isCompany = ["COMPANY_ADMIN", "COMPANY_USER"].includes(session.role);

    let context: string;

    if (isFirm && session.firmId) {
      const [transactions, companies, pendingCount, totalAccepted] =
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
              status: "PENDING",
              document: { firmId: session.firmId },
            },
          }),
          prisma.transaction.count({
            where: {
              status: "ACCEPTED",
              document: { firmId: session.firmId },
            },
          }),
        ]);

      const totalAmount = transactions.reduce(
        (sum, t) => sum + (t.totalAmount || 0),
        0,
      );
      const pendingAmount = transactions
        .filter((t) => t.status === "PENDING")
        .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

      context = `You are a financial assistant for an accounting firm on FinBridge. Here is the current data:

Total transactions: ${transactions.length}
Total pending transactions: ${pendingCount}
Total accepted transactions: ${totalAccepted}
Total amount across recent transactions: ₹${totalAmount.toLocaleString("en-IN")}
Pending amount: ₹${pendingAmount.toLocaleString("en-IN")}
Companies managed: ${companies.map((c) => `${c.name} (${c.isActive ? "active" : "inactive"})`).join(", ") || "None"}

Recent transactions:
${
  transactions
    .map(
      (t) =>
        `- ${t.vendorName || "Unknown vendor"}: ₹${(t.totalAmount || 0).toLocaleString("en-IN")} (${t.status}) from ${t.document.company.name} [Invoice: ${t.invoiceNumber || "N/A"}] on ${t.createdAt.toLocaleDateString("en-IN")}`,
    )
    .join("\n") || "No transactions found"
}`;
    } else if (isCompany && session.companyId) {
      const [transactions, pendingCount, documents] = await Promise.all([
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
            status: "PENDING",
            document: { companyId: session.companyId },
          },
        }),
        prisma.document.count({
          where: { companyId: session.companyId },
        }),
      ]);

      const totalSpending = transactions.reduce(
        (sum, t) => sum + (t.totalAmount || 0),
        0,
      );

      context = `You are a financial assistant for a company on FinBridge. Here is the current data:

Total documents uploaded: ${documents}
Total transactions: ${transactions.length}
Pending transactions: ${pendingCount}
Total spending across recent transactions: ₹${totalSpending.toLocaleString("en-IN")}

Recent transactions:
${
  transactions
    .map(
      (t) =>
        `- ${t.vendorName || "Unknown vendor"}: ₹${(t.totalAmount || 0).toLocaleString("en-IN")} (${t.status}) [Invoice: ${t.invoiceNumber || "N/A"}] on ${t.createdAt.toLocaleDateString("en-IN")}`,
    )
    .join("\n") || "No transactions found"
}`;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If the client is requesting context only (for local model), return it
    if (message === "__context_only__") {
      return NextResponse.json({ context });
    }

    const systemPrompt = `${context}

IMPORTANT INSTRUCTIONS:
- You are FinBridge AI, a helpful financial assistant.
- Answer questions based ONLY on the data provided above.
- Be concise, professional, and use Indian Rupee (₹) formatting.
- If the data doesn't contain enough information to answer, say so honestly.
- Format numbers with Indian comma separators (e.g., ₹1,23,456).
- When summarizing, use bullet points for clarity.
- Do NOT make up data that isn't in the context above.
- Keep responses under 300 words unless the user asks for detail.
- Be friendly and use a conversational tone.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("AI Chat error:", err);
    return NextResponse.json(
      { error: "Failed to process your question. Please try again." },
      { status: 500 },
    );
  }
}
