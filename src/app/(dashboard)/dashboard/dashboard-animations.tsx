"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Wallet, ArrowRight, Smartphone, Wifi,
  Clock, CheckCircle2, XCircle, TrendingUp,
} from "lucide-react";
import { staggerContainer, staggerItem } from "@/components/motion";
import { formatRupiah } from "@/lib/utils";

interface Order {
  id: string;
  productName: string;
  targetData: string;
  status: string;
  cost: number;
  serviceCategory: string;
  createdAt: string;
}

interface Props {
  greet: string;
  userName: string;
  balance: number;
  totalOrders: number;
  successOrders: number;
  referralCode: string;
  recentOrders: Order[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SUCCESS:   { label: "Selesai",  cls: "bg-emerald-100 text-emerald-700" },
    COMPLETED: { label: "Selesai",  cls: "bg-emerald-100 text-emerald-700" },
    PENDING:   { label: "Proses",   cls: "bg-amber-100 text-amber-700" },
    ACTIVE:    { label: "Aktif",    cls: "bg-blue-100 text-blue-700" },
    FAILED:    { label: "Gagal",    cls: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Batal",    cls: "bg-zinc-100 text-zinc-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function DashboardAnimations({
  greet,
  userName,
  balance,
  totalOrders,
  successOrders,
  referralCode,
  recentOrders,
}: Props) {
  const stats = [
    { label: "Total Pesanan", value: totalOrders, Icon: Clock, iconCls: "text-primary bg-primary/10" },
    { label: "Berhasil",      value: successOrders, Icon: CheckCircle2, iconCls: "text-emerald-600 bg-emerald-100" },
    { label: "Gagal / Batal", value: totalOrders - successOrders, Icon: XCircle, iconCls: "text-red-500 bg-red-100" },
    { label: "Kode Referral", value: referralCode, Icon: TrendingUp, iconCls: "text-amber-600 bg-amber-100" },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-5"
    >
      {/* ── Balance Banner ── */}
      <motion.div
        variants={staggerItem}
        className="relative overflow-hidden rounded-2xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}
      >
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute right-8 bottom-0 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-sm font-medium text-white/60">
            {greet}, {userName} 👋
          </p>
          <p className="text-xs text-white/50 mt-0.5">Saldo tersedia</p>
          <motion.p
            className="mt-1 text-5xl font-black tracking-tight"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {formatRupiah(balance)}
          </motion.p>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-block mt-5"
          >
            <Link
              href="/deposit"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25 transition-colors"
            >
              <Wallet className="h-4 w-4" /> Isi Saldo
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Stats Grid ── */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 400, damping: 28 }}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.iconCls}`}>
                <s.Icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="text-xl font-black text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Service Shortcuts ── */}
      <motion.div variants={staggerItem} className="grid gap-3 sm:grid-cols-2">
        {[
          {
            href: "/otp",
            Icon: Smartphone,
            label: "Jasa OTP",
            desc: "Virtual number 100+ negara",
            accent: "bg-primary/10 group-hover:bg-primary/20",
            iconColor: "text-primary",
          },
          {
            href: "/ppob",
            Icon: Wifi,
            label: "Layanan PPOB",
            desc: "Pulsa, PLN, game, dan lainnya",
            accent: "bg-emerald-100 group-hover:bg-emerald-200",
            iconColor: "text-emerald-600",
          },
        ].map((item) => (
          <motion.div
            key={item.href}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <Link
              href={item.href}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:shadow-md"
            >
              <div className={`rounded-xl p-3 transition-colors ${item.accent}`}>
                <item.Icon className={`h-5 w-5 ${item.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground">{item.label}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Recent Orders ── */}
      <motion.div
        variants={staggerItem}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-bold text-foreground">Pesanan Terbaru</h3>
          <Link href="/history" className="text-xs font-semibold text-primary hover:underline">
            Lihat semua →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <Smartphone className="mx-auto mb-3 h-10 w-10 opacity-20" />
            <p className="font-medium">Belum ada pesanan</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {recentOrders.map((order) => (
              <motion.div
                key={order.id}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
                }}
                className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 last:border-0 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{order.productName}</p>
                  <p className="truncate text-xs text-muted-foreground font-mono mt-0.5">{order.targetData}</p>
                </div>
                <div className="ml-4 flex items-center gap-3 shrink-0">
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-bold text-foreground">{formatRupiah(order.cost)}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
