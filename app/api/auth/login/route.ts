import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setAuthCookie } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const log = apiLogger("POST /api/auth/login");
const limiter = rateLimit({ interval: 60_000 });

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ROLE_REDIRECTS: Record<string, string> = {
  PLATFORM_ADMIN: "/admin",
  FIRM_ADMIN: "/firm",
  FIRM_ACCOUNTANT: "/firm",
  COMPANY_ADMIN: "/company",
  COMPANY_USER: "/company",
};

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const { success } = await limiter.check(10, `login:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json();
    const { email, password } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      log.warn({ email }, "Login failed — user not found or inactive");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      log.warn({ email }, "Login failed — wrong password");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Block users who are pending approval or rejected
    if (user.approvalStatus === "PENDING_APPROVAL") {
      log.info({ email }, "Login blocked — pending approval");
      // Still mint a token so they can reach the pending page
      const pendingToken = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        firmId: user.firmId || undefined,
        companyId: user.companyId || undefined,
        name: user.name,
      });
      const pendingRes = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        redirectUrl: "/pending-approval",
        pendingApproval: true,
      });
      const pendingCookie = setAuthCookie(pendingToken);
      pendingRes.cookies.set(pendingCookie);
      return pendingRes;
    }

    if (user.approvalStatus === "REJECTED") {
      log.warn({ email }, "Login blocked — account rejected");
      return NextResponse.json(
        { error: "Your account access has been denied. Please contact the administrator." },
        { status: 403 }
      );
    }

    // Track login timestamps for welcome/welcome-back logic
    const isFirstLogin = !user.lastLoginAt;
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    log.info({ email, role: user.role }, "User logged in");

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      firmId: user.firmId || undefined,
      companyId: user.companyId || undefined,
      name: user.name,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      redirectUrl: ROLE_REDIRECTS[user.role] || "/",
      isFirstLogin,
    });

    const cookieOpts = setAuthCookie(token);
    response.cookies.set(cookieOpts);
    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    log.error({ err }, "Login route error");
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
