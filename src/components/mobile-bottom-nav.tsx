"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Wallet, History, User, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/dashboard", label: "Home",     icon: LayoutDashboard },
  { href: "/deposit",   label: "Deposit",  icon: Wallet },
  { href: "/history",   label: "Activity", icon: History },
  { href: "/otp",       label: "Profile",  icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 w-full"
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: "1px solid hsl(var(--border))",
        boxShadow: "0 -4px 24px rgba(14,30,62,0.08), 0 -1px 0 rgba(14,30,62,0.04)",
      }}
    >
      <div className="relative flex items-end justify-around px-4 pb-safe pt-2">
        {/* Home */}
        <MobileNavItem
          href={navItems[0].href}
          label={navItems[0].label}
          icon={navItems[0].icon}
          isActive={pathname === navItems[0].href}
        />

        {/* Deposit */}
        <MobileNavItem
          href={navItems[1].href}
          label={navItems[1].label}
          icon={navItems[1].icon}
          isActive={pathname === navItems[1].href}
        />

        {/* FAB — Shop center button */}
        <div className="flex flex-col items-center" style={{ marginBottom: "6px" }}>
          <Link href="/otp" className="flex flex-col items-center">
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                boxShadow: "0 8px 24px rgba(79,70,229,0.40), 0 2px 8px rgba(79,70,229,0.20)",
                marginTop: "-20px",
              }}
            >
              <ShoppingBag className="h-6 w-6 text-white" />
            </motion.div>
            <span className="mt-1 text-[10px] font-semibold text-primary">Shop</span>
          </Link>
        </div>

        {/* Activity */}
        <MobileNavItem
          href={navItems[2].href}
          label={navItems[2].label}
          icon={navItems[2].icon}
          isActive={pathname === navItems[2].href || pathname.startsWith("/history")}
        />

        {/* Profile */}
        <MobileNavItem
          href={navItems[3].href}
          label={navItems[3].label}
          icon={navItems[3].icon}
          isActive={pathname === navItems[3].href || pathname.startsWith("/otp")}
        />
      </div>

      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}

function MobileNavItem({
  href, label, icon: Icon, isActive,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 py-1 px-3 min-w-[56px]">
      <motion.div
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-2xl transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      <span
        className={cn(
          "text-[10px] font-semibold transition-colors",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
