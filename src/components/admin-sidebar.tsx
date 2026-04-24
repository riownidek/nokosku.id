"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Receipt, Settings, Smartphone, ArrowLeft, LogOut, ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  // Since the existing admin page is a single-page with tabs, the sidebar might just act as anchor links or we just keep it simple.
  // Actually, wait, the existing admin page has Tabs for Users, Transactions, Settings.
  // If we want a sidebar, maybe they just point to /admin? Or perhaps the user means "these features are in the admin page".
  // Let's just create generic items and since it's a single page app at /admin, we can let them click or we just show them as active.
  { href: "#", label: "Manajemen Pengguna", icon: Users },
  { href: "#", label: "Log Transaksi", icon: Receipt },
  { href: "#", label: "App Config", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex flex-col h-full w-64 shrink-0"
      style={{
        background: "hsl(220, 30%, 12%)", // Dark, distinct admin sidebar
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
          <span className="block text-base font-black tracking-tight">NOKOSMU ADMIN</span>
          <span className="block text-[10px] text-red-400 font-bold tracking-widest uppercase">Mode Pengelola</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <p className="px-2 pb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">
          Administrator
        </p>
        
        <Link
          href="/admin"
          className={cn("sidebar-link active flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all", "bg-white/10 text-white")}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Dasbor Admin</span>
        </Link>
        
        {/* We can't link to separate pages if they don't exist, but we show them as disabled or just informative */}
        <div className="px-3 py-2.5 flex items-center gap-3 text-white/60">
          <Users className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Manajemen Data</span>
        </div>
        <div className="px-3 py-2.5 flex items-center gap-3 text-white/60">
          <Receipt className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Log Transaksi</span>
        </div>
        <div className="px-3 py-2.5 flex items-center gap-3 text-white/60">
          <Settings className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">App Config</span>
        </div>
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
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar (Logout)
        </button>
      </div>
    </aside>
  );
}
