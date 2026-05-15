import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { signToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// NextAuth handles the Google OAuth dance and writes its own session cookie,
// but our proxy.ts only knows about the custom `finbridge_token` JWT. This
// route reads the NextAuth session, mints a finbridge_token for the same user,
// and redirects to the role-appropriate dashboard.
const ROLE_PATHS: Record<string, string> = {
  PLATFORM_ADMIN: "/admin",
  FIRM_ADMIN: "/firm",
  FIRM_ACCOUNTANT: "/firm",
  COMPANY_ADMIN: "/company",
  COMPANY_USER: "/company",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return NextResponse.redirect(new URL("/login?error=no_account", req.url));
  }

  // Track login for welcome/welcome-back logic
  if (user.approvalStatus === "APPROVED") {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    firmId: user.firmId ?? undefined,
    companyId: user.companyId ?? undefined,
  });

  // Redirect pending users to approval waiting page
  const dest =
    user.approvalStatus === "PENDING_APPROVAL"
      ? "/pending-approval"
      : user.approvalStatus === "REJECTED"
        ? "/login?error=rejected"
        : ROLE_PATHS[user.role] ?? "/login";
  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.set("finbridge_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
