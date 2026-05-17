"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Receipt, Settings, ArrowLeft,
  LogOut, ShieldCheck, Smartphone, Menu, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { href: "/admin",              label: "Dasbor Admin",       icon: LayoutDashboard },
  { href: "/admin/users",        label: "Manajemen Pengguna", icon: Users },
  { href: "/admin/transactions", label: "Log Transaksi",      icon: Receipt },
  { href: "/admin/config",       label: "App Config",         icon: Settings },
  { href: "/admin/otp-services", label: "Layanan OTP",        icon: Smartphone },
];

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === "/admin"
          ? pathname === "/admin"
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
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
    </>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.aside
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col md:hidden"
            style={{ background: "hsl(220, 30%, 12%)", color: "white" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="block text-base font-black tracking-tight">NOKOSKU ADMIN</span>
                  <span className="block text-[10px] text-red-400 font-bold tracking-widest uppercase">Mode Pengelola</span>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
              <p className="px-2 pb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">
                Administrator
              </p>
              <NavLinks onClose={onClose} />
            </nav>

            {/* Footer */}
            <div className="border-t border-white/10 p-4 space-y-2">
              <Link href="/dashboard" onClick={onClose}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Kembali ke Dasbor User
              </Link>
              <a href="/api/auth/clear-session"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
                <LogOut className="h-4 w-4 shrink-0" />
                Keluar (Logout)
              </a>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────
function DesktopSidebar() {
  return (
    <aside
      className="hidden md:flex flex-col h-full w-64 shrink-0"
      style={{ background: "hsl(220, 30%, 12%)", color: "white", borderRight: "1px solid hsl(220, 30%, 18%)" }}
    >
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="block text-base font-black tracking-tight">NOKOSKU ADMIN</span>
          <span className="block text-[10px] text-red-400 font-bold tracking-widest uppercase">Mode Pengelola</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <p className="px-2 pb-3 text-[10px] font-bold uppercase tracking-widest text-white/50">Administrator</p>
        <NavLinks />
      </nav>
      <div className="border-t border-white/10 p-4 space-y-2">
        <Link href="/dashboard"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Kembali ke Dasbor User
        </Link>
        <a href="/api/auth/clear-session"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar (Logout)
        </a>
      </div>
    </aside>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function AdminSidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      <DesktopSidebar />
      {/* Hamburger trigger — only on mobile, rendered into the header via context-free button */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {/* Floating hamburger button shown on mobile */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Buka menu admin"
        className="md:hidden fixed top-3.5 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-white shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  );
}
