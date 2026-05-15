import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "PLATFORM_ADMIN") redirect("/login");

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
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </form>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
