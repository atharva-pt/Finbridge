import { NextResponse } from "next/server";
import { validateActiveSession } from "@/lib/auth";
import { buildAiContext, AI_SYSTEM_SUFFIX } from "@/lib/ai-context";
import OpenAI from "openai";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const limiter = rateLimit({ interval: 60_000 });

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  try {
    const { session, error, status: authStatus } = await validateActiveSession();
    if (!session) {
      return NextResponse.json(error, { status: authStatus });
    }

    const { success } = await limiter.check(30, `ai-chat-openai:${session.userId}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
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

    const context = await buildAiContext(session);
    if (!context) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const systemPrompt = context + AI_SYSTEM_SUFFIX;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("OpenAI Chat error:", err);
    return NextResponse.json(
      { error: "Failed to process your question. Please try again." },
      { status: 500 },
    );
  }
}
