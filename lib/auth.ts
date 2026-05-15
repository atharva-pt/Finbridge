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

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
