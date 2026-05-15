import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

const ROLE_ROUTES: Record<string, string[]> = {
  PLATFORM_ADMIN: ["/admin"],
  FIRM_ADMIN: ["/firm"],
  FIRM_ACCOUNTANT: ["/firm"],
  COMPANY_ADMIN: ["/company"],
  COMPANY_USER: ["/company"],
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("finbridge_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("finbridge_token");
    return response;
  }

  const allowedPaths = ROLE_ROUTES[payload.role] || [];
  const hasAccess = allowedPaths.some((p) => pathname.startsWith(p));

  if (!hasAccess && pathname !== "/dashboard") {
    const defaultPath = allowedPaths[0] || "/login";
    return NextResponse.redirect(new URL(defaultPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
