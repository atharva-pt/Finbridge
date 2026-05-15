import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { UserRole } from ".prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "finbridge-dev-secret-change-in-prod";
const COOKIE_NAME = "finbridge_token";

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  firmId?: string;
  companyId?: string;
  name: string;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getFullUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { firm: true, company: true },
    // approvalStatus, lastLoginAt are scalar fields — included by default
  });
}

export function setAuthCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  };
}

/**
 * Validates the current session user is still active and their org still exists.
 * Returns null + a 401 response if invalid — caller should return the response immediately.
 */
export async function validateActiveSession() {
  const session = await getSession();
  if (!session) {
    return { session: null, error: { error: "Unauthorized" }, status: 401 } as const;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isActive: true, firmId: true, companyId: true },
  });

  if (!user || !user.isActive) {
    return { session: null, error: { error: "Account deactivated or deleted" }, status: 401 } as const;
  }

  // Verify the org still exists
  if (session.firmId) {
    const firm = await prisma.accountingFirm.findUnique({
      where: { id: session.firmId },
      select: { isActive: true },
    });
    if (!firm || !firm.isActive) {
      return { session: null, error: { error: "Firm no longer exists or is deactivated" }, status: 403 } as const;
    }
  }

  if (session.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: session.companyId },
      select: { isActive: true },
    });
    if (!company || !company.isActive) {
      return { session: null, error: { error: "Company no longer exists or is deactivated" }, status: 403 } as const;
    }
  }

  return { session, error: null, status: 200 } as const;
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
