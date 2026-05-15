import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { sendNewUserNotificationToAdmin } from "@/lib/email";

/**
 * Fire-and-forget: notify the highest-authority admin about a new sign-up.
 * This MUST NOT throw — any failure is logged and swallowed so that the
 * NextAuth signIn callback always returns `true` for the new user.
 */
async function notifyAdminAboutNewUser(
  userName: string,
  userEmail: string
): Promise<void> {
  try {
    const admin = await prisma.user.findFirst({
      where: {
        role: "PLATFORM_ADMIN",
        isActive: true,
        approvalStatus: "APPROVED",
      },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) {
      logger.warn("No PLATFORM_ADMIN found to notify about new user");
      return;
    }

    // Email — non-blocking
    sendNewUserNotificationToAdmin(admin.email, userName, userEmail).catch(
      (err) => logger.error({ err }, "Failed to send admin notification email")
    );

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: "New User Awaiting Approval",
        body: `${userName} (${userEmail}) has signed up and is waiting for your approval.`,
        type: "warning",
        link: "/admin/users",
      },
    });
  } catch (err) {
    // Swallow — admin notification failure must never block sign-in
    logger.error({ err }, "notifyAdminAboutNewUser failed (non-blocking)");
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
          if (!user || !user.isActive) return null;
          const valid = await verifyPassword(
            credentials.password as string,
            user.passwordHash
          );
          if (!valid) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            firmId: user.firmId,
            companyId: user.companyId,
          };
        } catch (err) {
          logger.error({ err }, "Credentials auth error");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existing = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (existing) {
            // User already exists — let them through. The google-bridge
            // route will check approvalStatus and redirect accordingly.
            return true;
          }

          // ---------- Brand-new Google sign-up ----------
          // Attach to first firm/company for the hackathon demo.
          const defaultFirm = await prisma.accountingFirm.findFirst();
          const defaultCompany = defaultFirm
            ? await prisma.company.findFirst({
                where: { firmId: defaultFirm.id },
              })
            : null;

          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || "Google User",
              passwordHash: await hashPassword(
                Math.random().toString(36).slice(2)
              ),
              role: "COMPANY_USER",
              approvalStatus: "PENDING_APPROVAL",
              avatarUrl: user.image,
              firmId: defaultFirm?.id ?? null,
              companyId: defaultCompany?.id ?? null,
            },
          });

          logger.info(
            { email: user.email },
            "New user created via Google OAuth (pending approval)"
          );

          // Notify admin in the background — never blocks sign-in
          notifyAdminAboutNewUser(
            user.name || "Google User",
            user.email!
          );
        } catch (err) {
          logger.error({ err }, "Google signIn callback error");
          // IMPORTANT: still return true so the user isn't shown
          // "AccessDenied". The google-bridge will handle the redirect
          // to the pending-approval page or an error page.
          return true;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.firmId = dbUser.firmId;
          token.companyId = dbUser.companyId;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = session.user as any;
        u.role = token.role;
        u.firmId = token.firmId;
        u.companyId = token.companyId;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
});
