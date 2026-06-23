"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Smartphone, History, User,
  ShoppingBag, MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Nav items: 2 kiri + FAB tengah + 2 kanan = 5 slot proporsional ───────────
const LEFT_NAV = [
  { href: "/dashboard", label: "Beranda",  Icon: LayoutDashboard },
  { href: "/otp",       label: "OTP",      Icon: Smartphone },
];
const RIGHT_NAV = [
  { href: "/history",  label: "Riwayat",  Icon: History },
  { href: "/profile",  label: "Profil",   Icon: User },
];

const CS_LINK = "https://t.me/infonokoskuid";

// ── Single nav item ───────────────────────────────────────────────────────────
function NavItem({
  href, label, Icon, isActive,
}: {
  href: string; label: string; Icon: React.ElementType; isActive: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="flex flex-col items-center justify-center gap-0.5 py-1.5 flex-1 min-w-0"
    >
      <motion.div
        whileTap={{ scale: 0.80 }}
        transition={{ type: "spring", stiffness: 600, damping: 30 }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-xl transition-colors duration-150",
          isActive ? "bg-primary/10" : ""
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            isActive ? "text-primary" : "text-muted-foreground/65"
          )}
        />
      </motion.div>
      <span
        className={cn(
          "text-[9px] font-semibold leading-none truncate max-w-full",
          isActive ? "text-primary" : "text-muted-foreground/60"
        )}
      >
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="bottom-nav-dot"
          className="h-0.5 w-4 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
    </Link>
  );
}

// ── Center FAB (PPOB / Shop) ──────────────────────────────────────────────────
function FABItem() {
  return (
    <Link
      href="/ppob"
      prefetch
      className="flex flex-col items-center justify-end flex-1 min-w-0 pb-1"
    >
      <motion.div
        whileTap={{ scale: 0.87 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className="flex h-12 w-12 items-center justify-center rounded-full -mt-5"
        style={{
          background: "linear-gradient(135deg,#4F46E5,#7C3AED)",
          boxShadow: "0 6px 18px rgba(79,70,229,0.40)",
        }}
      >
        <ShoppingBag className="h-5 w-5 text-white" />
      </motion.div>
      <span className="mt-0.5 text-[9px] font-bold text-primary leading-none">Shop</span>
    </Link>
  );
}

// ── CS Button ─────────────────────────────────────────────────────────────────
function CSItem() {
  return (
    <a
      href={CS_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center justify-center gap-0.5 py-1.5 flex-1 min-w-0"
    >
      <motion.div
        whileTap={{ scale: 0.80 }}
        transition={{ type: "spring", stiffness: 600, damping: 30 }}
        className="flex h-7 w-7 items-center justify-center rounded-xl transition-colors duration-150"
      >
        <MessageCircle className="h-[18px] w-[18px] shrink-0 text-emerald-500" />
      </motion.div>
      <span className="text-[9px] font-semibold leading-none text-emerald-500 truncate max-w-full">
        CS
      </span>
    </a>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MobileBottomNav() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        background: "rgba(255,255,255,0.93)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderTop: "1px solid rgba(14,30,62,0.07)",
        boxShadow: "0 -2px 16px rgba(14,30,62,0.06)",
      }}
    >
      {/* Safe area for iPhone home indicator */}
      <div
        className="flex items-end justify-around w-full px-1 pt-1 pb-safe"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        {LEFT_NAV.map((item) => (
          <NavItem key={item.href} {...item} isActive={active(item.href)} />
        ))}
        <FABItem />
        {RIGHT_NAV.map((item) => (
          <NavItem key={item.href} {...item} isActive={active(item.href)} />
        ))}
        <CSItem />
      </div>
    </nav>
  );
}
