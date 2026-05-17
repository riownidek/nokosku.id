import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AutoLogout } from "@/components/auto-logout";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white pl-14 pr-4 md:pl-8 md:pr-8 shadow-sm">
      <h1 className="text-lg font-black tracking-tight text-slate-800">Administrator Panel</h1>
    </header>
  );
}


export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  
  // Double layer of protection: Layout level redirect
  if ((session.user as any).role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <AdminHeader />

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      <AutoLogout />
      <Toaster position="top-right" />
    </div>
  );
}
