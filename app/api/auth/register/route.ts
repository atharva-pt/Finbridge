import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setAuthCookie } from "@/lib/auth";
import { sendNewUserNotificationToAdmin } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000 });

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["COMPANY_ADMIN", "FIRM_ADMIN", "FIRM_ACCOUNTANT", "COMPANY_USER"]),
  companyName: z.string().optional(),
  firmName: z.string().optional(),
});

const ROLE_REDIRECTS: Record<string, string> = {
  PLATFORM_ADMIN: "/admin",
  FIRM_ADMIN: "/firm",
  FIRM_ACCOUNTANT: "/firm",
  COMPANY_ADMIN: "/company",
  COMPANY_USER: "/company",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

async function uniqueSlug(base: string, table: "accountingFirm" | "company"): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing =
      table === "accountingFirm"
        ? await prisma.accountingFirm.findUnique({ where: { slug: candidate } })
        : await prisma.company.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix++;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    const { success } = await limiter.check(5, `register:${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);

    let firmId: string | undefined;
    let companyId: string | undefined;

    // Create firm if firm role
    if (data.role === "FIRM_ADMIN" && data.firmName) {
      const slug = await uniqueSlug(data.firmName, "accountingFirm");
      const firm = await prisma.accountingFirm.create({
        data: {
          name: data.firmName,
          slug,
          email: data.email,
          plan: "starter",
        },
      });
      firmId = firm.id;
    }

    // Create company if company role
    if ((data.role === "COMPANY_ADMIN" || data.role === "COMPANY_USER") && data.companyName) {
      // For standalone company registration, we need a firm.
      // Create a placeholder firm or find a default one.
      // In a real flow, company users would be invited by a firm.
      // Here we create a default self-managed firm for standalone sign-ups.
      const firmSlug = await uniqueSlug(`${data.companyName}-firm`, "accountingFirm");
      const defaultFirm = await prisma.accountingFirm.create({
        data: {
          name: `${data.companyName} (Self-Managed)`,
          slug: firmSlug,
          email: data.email,
          plan: "starter",
        },
      });

      const companySlug = await uniqueSlug(data.companyName, "company");
      const company = await prisma.company.create({
        data: {
          name: data.companyName,
          slug: companySlug,
          email: data.email,
          firmId: defaultFirm.id,
        },
      });
      companyId = company.id;
      firmId = defaultFirm.id;
    }

    // Create the user with PENDING_APPROVAL status
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        approvalStatus: "PENDING_APPROVAL",
        firmId: firmId ?? null,
        companyId: companyId ?? null,
      },
    });

    // Notify the highest-authority admin
    const admin = await prisma.user.findFirst({
      where: {
        role: "PLATFORM_ADMIN",
        isActive: true,
        approvalStatus: "APPROVED",
      },
      orderBy: { createdAt: "asc" },
    });
    if (admin) {
      // Send email (non-blocking)
      sendNewUserNotificationToAdmin(admin.email, data.name, data.email).catch(
        (err) => console.warn("Email send failed (non-blocking):", err)
      );
      // In-app notification
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "New User Awaiting Approval",
          body: `${data.name} (${data.email}) has registered and is waiting for approval.`,
          type: "warning",
          link: "/admin/users",
        },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      firmId: user.firmId || undefined,
      companyId: user.companyId || undefined,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        redirectUrl: "/pending-approval",
        pendingApproval: true,
      },
      { status: 201 }
    );

    const cookieOpts = setAuthCookie(token);
    response.cookies.set(cookieOpts);
    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
