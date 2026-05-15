import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { AutoLogout } from "@/components/auto-logout";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = (session.user as any).role === "ADMIN";

  // ── Maintenance mode check — server-side, reliable, tidak terpengaruh Edge runtime ──
  if (!isAdmin) {
    try {
      const cfg = await prisma.appConfig.findUnique({ where: { key: "maintenance_mode" } });
      console.log(`[Layout Maintenance] value="${cfg?.value}" isActive=${cfg?.value === "true"}`);
      if (cfg?.value === "true") redirect("/maintenance");
    } catch (e: any) {
      console.error("[Layout Maintenance] Prisma error:", e?.message ?? e);
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <Sidebar role={session.user.role as string} />

      <div className="flex flex-1 flex-col min-w-0">
        <Header />

        {/* Main content — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-24 sm:pb-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      {/* Auto-logout: signOut setelah 10 menit tidak aktif */}
      <AutoLogout />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(14,30,62,0.12), 0 2px 8px rgba(14,30,62,0.06)",
          },
        }}
      />
    </div>
  );
}
