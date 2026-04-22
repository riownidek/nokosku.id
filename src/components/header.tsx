"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Bell, ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const initial = (session?.user?.name ?? session?.user?.email ?? "U")[0].toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between px-6"
      style={{
        background: "rgba(255,255,255,0.80)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid hsl(var(--border))",
        boxShadow: "0 1px 0 rgba(14,30,62,0.04)",
      }}
    >
      {/* Page title slot (empty — each page sets its own h1) */}
      <div />

      <div className="flex items-center gap-3">
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
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted transition-colors"
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              {initial}
            </div>
            <span className="hidden text-sm font-semibold text-foreground sm:block max-w-[120px] truncate">
              {session?.user?.name ?? session?.user?.email ?? "User"}
            </span>
            <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className="absolute right-0 top-[calc(100%+8px)] z-20 w-52 rounded-2xl border border-border bg-card p-1.5 shadow-xl"
                  style={{ boxShadow: "0 8px 32px rgba(14,30,62,0.12), 0 2px 8px rgba(14,30,62,0.06), 0 0 0 1px rgba(14,30,62,0.04)" }}
                >
                  <div className="mb-1 border-b border-border px-3 py-2.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {session?.user?.name ?? "User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{session?.user?.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
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
