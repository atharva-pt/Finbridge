import { getSession, getFullUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    // Check approval status before redirecting to dashboard
    const user = await getFullUser(session.userId);
    if (user?.approvalStatus === "PENDING_APPROVAL") {
      redirect("/pending-approval");
    }
    if (user?.approvalStatus === "REJECTED") {
      redirect("/login?error=rejected");
    }

    const routes: Record<string, string> = {
      PLATFORM_ADMIN: "/admin",
      FIRM_ADMIN: "/firm",
      FIRM_ACCOUNTANT: "/firm",
      COMPANY_ADMIN: "/company",
      COMPANY_USER: "/company",
    };
    redirect(routes[session.role] || "/login");
  }
  return <LandingPage />;
}
