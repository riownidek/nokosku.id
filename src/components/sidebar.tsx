"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Smartphone, Wifi, Wallet,
  History, ShieldCheck, LogOut, Code2,
} from "lucide-react";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { href: "/otp",       label: "Jasa OTP",      icon: Smartphone },
  { href: "/ppob",      label: "Layanan PPOB",  icon: Wifi },
  { href: "/deposit",   label: "Isi Saldo",     icon: Wallet },
  { href: "/history",   label: "Riwayat",       icon: History },
  { href: "/api-docs",  label: "Dokumentasi API", icon: Code2 },
];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();

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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
        >
          {/* SIM Card SVG Icon */}
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7 2H14.5L19 6.5V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V4C5 2.9 5.9 2 7 2Z"
              fill="white" fillOpacity="0.9"
            />
            <rect x="8" y="11" width="3" height="3" rx="0.5" fill="#4F46E5"/>
            <rect x="13" y="11" width="3" height="3" rx="0.5" fill="#4F46E5"/>
            <rect x="8" y="16" width="3" height="3" rx="0.5" fill="#4F46E5"/>
            <rect x="13" y="16" width="3" height="3" rx="0.5" fill="#4F46E5"/>
            <path d="M14 2L19 7H15C14.45 7 14 6.55 14 6V2Z" fill="white" fillOpacity="0.5"/>
          </svg>
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
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-link w-full text-left text-destructive hover:text-destructive hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
