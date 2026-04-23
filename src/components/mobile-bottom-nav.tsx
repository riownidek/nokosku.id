"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Wallet, History, User, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const LEFT_NAV = [
  { href: "/dashboard", label: "Beranda", Icon: LayoutDashboard },
  { href: "/deposit",   label: "Deposit",  Icon: Wallet },
];
const RIGHT_NAV = [
  { href: "/history",   label: "Aktivitas", Icon: History },
  { href: "/otp",       label: "Profil",    Icon: User },   // ← "Profil" bukan "Layanan"
];

function NavItem({ href, label, Icon, isActive }: {
  href: string; label: string; Icon: React.ElementType; isActive: boolean;
}) {
  return (
    <Link href={href} prefetch className="flex flex-1 flex-col items-center gap-0.5 py-1.5">
      <motion.div whileTap={{ scale: 0.80 }} transition={{ type: "spring", stiffness: 600, damping: 30 }}
        className={cn("flex h-7 w-7 items-center justify-center rounded-xl transition-colors duration-150", isActive ? "bg-primary/10" : "")}>
        <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-primary" : "text-muted-foreground/65")} />
      </motion.div>
      <span className={cn("text-[9.5px] font-semibold leading-none", isActive ? "text-primary" : "text-muted-foreground/60")}>
        {label}
      </span>
      {isActive && (
        <motion.div layoutId="bottom-nav-dot" className="h-0.5 w-4 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 500, damping: 35 }} />
      )}
    </Link>
  );
}

function FABItem() {
  return (
    <Link href="/ppob" prefetch className="flex -mt-4 flex-col items-center">
      <motion.div whileTap={{ scale: 0.87 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)", boxShadow: "0 6px 18px rgba(79,70,229,0.40)" }}>
        <ShoppingBag className="h-5 w-5 text-white" />
      </motion.div>
      <span className="mt-1 text-[9.5px] font-bold text-primary">Shop</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const active = (href: string) => href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(24px) saturate(200%)",
        WebkitBackdropFilter: "blur(24px) saturate(200%)",
        borderTop: "1px solid rgba(14,30,62,0.07)",
        boxShadow: "0 -2px 16px rgba(14,30,62,0.07)",
      }}>
      <div className="flex items-end justify-around px-2 pt-1.5 pb-3">
        {LEFT_NAV.map((item) => <NavItem key={item.href} {...item} isActive={active(item.href)} />)}
        <FABItem />
        {RIGHT_NAV.map((item) => <NavItem key={item.href} {...item} isActive={active(item.href)} />)}
      </div>
    </nav>
  );
}
