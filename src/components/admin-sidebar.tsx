"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Receipt, Settings, ArrowLeft, LogOut, ShieldCheck, BugPlay
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Dasbor Admin", icon: LayoutDashboard },
    { href: "/admin/users", label: "Manajemen Pengguna", icon: Users },
    { href: "/admin/transactions", label: "Log Transaksi", icon: Receipt },
    { href: "/admin/config", label: "App Config", icon: Settings },
    { href: "/admin/debug", label: "Sistem Debug", icon: BugPlay },
  ];

  return (
    <aside
      className="hidden md:flex flex-col h-full w-64 shrink-0"
      style={{
        background: "hsl(220, 30%, 12%)",
        color: "white",
        borderRight: "1px solid hsl(220, 30%, 18%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="block text-base font-black tracking-tight">NOKOSKU ADMIN</span>
          <span className="block text-[10px] text-red-400 font-bold tracking-widest uppercase">Mode Pengelola</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <p className="px-2 pb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">
          Administrator
        </p>

        {navItems.map((item) => {
          // Strict exact match for /admin, prefix match for others
          const isActive = item.href === "/admin" 
            ? pathname === "/admin" 
            : pathname.startsWith(item.href);
            
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                isActive 
                  ? "bg-white/10 text-white shadow-sm" 
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-red-400" : "")} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Back to User */}
      <div className="border-t border-white/10 p-4 space-y-2">
        <Link
          href="/dashboard"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Kembali ke Dasbor User
        </Link>
        <a
          href="/api/auth/clear-session"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar (Logout)
        </a>
      </div>
    </aside>
  );
}
