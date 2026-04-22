"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Wallet, History, User, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useCallback } from "react";

const NAV = [
  { href: "/dashboard", label: "Beranda",  Icon: LayoutDashboard },
  { href: "/deposit",   label: "Deposit",  Icon: Wallet },
  { href: "/otp",       label: "Shop",     Icon: ShoppingBag, fab: true },
  { href: "/history",   label: "Aktivitas",Icon: History },
  { href: "/otp",       label: "Layanan",  Icon: User },
];

function NavBtn({ href, label, Icon, isActive, fab }: {
  href: string; label: string; Icon: React.ElementType; isActive: boolean; fab?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const go = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isActive) return;
    setLoading(true);
    router.push(href);
  }, [href, isActive, router]);

  if (fab) {
    return (
      <a href={href} onClick={go}
        className="flex flex-col items-center -mt-5 relative">
        <motion.div
          whileTap={{ scale: 0.88 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg,#4F46E5,#7C3AED)",
            boxShadow: "0 6px 20px rgba(79,70,229,0.45), 0 2px 6px rgba(79,70,229,0.25)",
          }}>
          {loading
            ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            : <Icon className="h-5 w-5 text-white" />}
        </motion.div>
        <span className="mt-1 text-[9px] font-bold text-primary">{label}</span>
      </a>
    );
  }

  return (
    <a href={href} onClick={go}
      className="flex flex-col items-center gap-0.5 py-1 min-w-[52px] flex-1">
      <motion.div
        whileTap={{ scale: 0.82 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-xl transition-colors",
          isActive ? "bg-primary/10" : ""
        )}>
        {loading
          ? <span className={cn("h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin",
              isActive ? "border-primary" : "border-muted-foreground")} />
          : <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-primary" : "text-muted-foreground/70")} />}
      </motion.div>
      <span className={cn("text-[9.5px] font-semibold leading-none",
        isActive ? "text-primary" : "text-muted-foreground/60")}>
        {label}
      </span>
      {isActive && (
        <motion.div layoutId="nav-dot"
          className="h-0.5 w-4 rounded-full bg-primary mt-0.5"
          transition={{ type: "spring", stiffness: 500, damping: 35 }} />
      )}
    </a>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(24px) saturate(200%)",
        WebkitBackdropFilter: "blur(24px) saturate(200%)",
        borderTop: "1px solid rgba(14,30,62,0.07)",
        boxShadow: "0 -2px 16px rgba(14,30,62,0.07)",
      }}>
      <div className="flex items-end justify-around px-2 pt-2 pb-3">
        <NavBtn href={NAV[0].href} label={NAV[0].label} Icon={NAV[0].Icon} isActive={isActive(NAV[0].href)} />
        <NavBtn href={NAV[1].href} label={NAV[1].label} Icon={NAV[1].Icon} isActive={isActive(NAV[1].href)} />
        <NavBtn href={NAV[2].href} label={NAV[2].label} Icon={NAV[2].Icon} isActive={false} fab />
        <NavBtn href={NAV[3].href} label={NAV[3].label} Icon={NAV[3].Icon} isActive={isActive(NAV[3].href)} />
        <NavBtn href={NAV[4].href} label={NAV[4].label} Icon={NAV[4].Icon} isActive={false} />
      </div>
    </nav>
  );
}
