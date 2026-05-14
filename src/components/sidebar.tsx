"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Smartphone, Wifi, Wallet,
  History, ShieldCheck, LogOut, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard",   icon: LayoutDashboard },
  { href: "/otp",       label: "Jasa OTP",     icon: Smartphone },
  { href: "/ppob",      label: "Layanan PPOB", icon: Wifi },
  { href: "/deposit",   label: "Isi Saldo",    icon: Wallet },
  { href: "/history",   label: "Riwayat",      icon: History },
];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  return (
    <aside
      className="hidden md:flex flex-col h-full w-60 shrink-0"
      style={{
        background: "hsl(var(--card))",
        borderRight: "1px solid hsl(var(--border))",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <motion.div
          whileHover={{ scale: 1.08, rotate: -5 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden"
        >
          <img src="/logo_1.webp" alt="Nokosku Logo" className="w-full h-full object-cover" />
        </motion.div>
        <span className="text-lg font-black tracking-tight text-foreground">NOKOSKU</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          Menu Utama
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-link relative", isActive && "active")}
            >
              <item.icon className="h-4 w-4 shrink-0 relative z-10" />
              <span className="relative z-10">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.10), rgba(124,58,237,0.05))" }}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <>
            <p className="px-2 pb-2 pt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Administrasi
            </p>
            <Link
              href="/admin"
              className={cn("sidebar-link", pathname === "/admin" && "active")}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Panel Admin
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-border p-3">
        <button
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            await signOut({ callbackUrl: "/login", redirect: true });
          }}
          className="sidebar-link w-full text-left text-destructive hover:text-destructive hover:bg-red-50 disabled:opacity-60"
        >
          {loggingOut
            ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            : <LogOut className="h-4 w-4 shrink-0" />}
          {loggingOut ? "Keluar..." : "Keluar"}
        </button>
      </div>
    </aside>
  );
}
