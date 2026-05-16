import { getSession, getFullUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AiChatPanel } from "@/components/ai/chat-panel";

export default async function FirmLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["FIRM_ADMIN", "FIRM_ACCOUNTANT"].includes(session.role)) redirect("/login");

  // Validate user still exists, is active, and firm still exists
  const fullUser = await getFullUser(session.userId);
  if (!fullUser || !fullUser.isActive) redirect("/login");
  if (!fullUser.firm) redirect("/login");
  if (fullUser.approvalStatus === "PENDING_APPROVAL") redirect("/pending-approval");
  if (fullUser.approvalStatus === "REJECTED") redirect("/login?error=rejected");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        role={session.role}
        user={{ name: session.name, email: session.email, avatarUrl: null }}
      />
      <main className="flex-1 overflow-auto flex flex-col">
        <Topbar />
        <div className="flex-1 p-6 lg:p-8">{children}</div>
      </main>
      <AiChatPanel />
    </div>
  );
}
