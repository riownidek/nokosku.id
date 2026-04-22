"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Bell, ChevronDown, LogOut, LayoutDashboard, Wallet, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import useSWR from "swr";
import { formatRupiah } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Header() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Fetch live balance
  const { data: profile } = useSWR(
    session?.user?.id ? "/api/profile" : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  const initial = (session?.user?.name ?? session?.user?.email ?? "U")[0].toUpperCase();
  const balance = profile?.balance ?? 0;

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 md:px-6"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid hsl(var(--border))",
        boxShadow: "0 1px 0 rgba(14,30,62,0.04)",
      }}
    >
      {/* Left: Brand on mobile */}
      <div className="flex items-center gap-2 sm:hidden">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
        >
          <span className="text-xs font-black text-white">N</span>
        </div>
        <span className="text-sm font-black tracking-tight text-foreground">NOKOSMU</span>
      </div>

      {/* Left: empty on desktop (sidebar has logo) */}
      <div className="hidden sm:block" />

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Balance chip — e-wallet style */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <Link
            href="/deposit"
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors"
            style={{
              background: "linear-gradient(135deg, rgba(79,70,229,0.06), rgba(124,58,237,0.04))",
              border: "1px solid rgba(79,70,229,0.15)",
            }}
          >
            <div className="text-right">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Saldo
              </p>
              <p className="text-xs font-black text-primary leading-none">
                {formatRupiah(balance)}
              </p>
            </div>
            <div
              className="flex h-6 w-6 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              <Plus className="h-3 w-3 text-white" />
            </div>
          </Link>
        </motion.div>

        {/* Notification bell */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="relative flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Bell className="h-4 w-4" />
        </motion.button>

        {/* Avatar + dropdown */}
        <div className="relative">
          <motion.button
            onClick={() => setDropdownOpen((o) => !o)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted transition-colors"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              {initial}
            </div>
            <span className="hidden text-sm font-semibold text-foreground sm:block max-w-[100px] truncate">
              {session?.user?.name ?? session?.user?.email ?? "User"}
            </span>
            <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute right-0 top-[calc(100%+8px)] z-20 w-52 rounded-2xl border border-border bg-card p-1.5"
                  style={{ boxShadow: "0 8px 32px rgba(14,30,62,0.12), 0 2px 8px rgba(14,30,62,0.06), 0 0 0 1px rgba(14,30,62,0.04)" }}
                >
                  <div className="mb-1 border-b border-border px-3 py-2.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {session?.user?.name ?? "User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{session?.user?.email}</p>
                    {/* Balance in dropdown */}
                    <div className="mt-1.5 rounded-lg px-2 py-1" style={{ background: "rgba(79,70,229,0.06)" }}>
                      <p className="text-[10px] text-muted-foreground">Saldo tersedia</p>
                      <p className="text-sm font-black text-primary">{formatRupiah(balance)}</p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  <Link
                    href="/deposit"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Wallet className="h-4 w-4" /> Isi Saldo
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> Keluar
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
