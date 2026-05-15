import { getSession, getFullUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSignOutButton } from "./sign-out-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "PLATFORM_ADMIN") redirect("/login");

  const user = await getFullUser(session.userId);
  if (!user || !user.isActive) redirect("/login");
  if (user.approvalStatus === "PENDING_APPROVAL") redirect("/pending-approval");
  if (user.approvalStatus === "REJECTED") redirect("/login?error=rejected");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 h-14 px-6 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <span className="font-bold text-sm text-foreground">FinBridge</span>
          <span className="text-muted-foreground/40 text-sm">·</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform Admin</span>
        </div>
        <AdminSignOutButton />
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
