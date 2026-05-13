"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet, ArrowRight, Smartphone, Wifi,
  CheckCircle2, Activity, Zap, ChevronRight,
  ShoppingBag, Clock,
} from "lucide-react";
import { staggerContainer, staggerItem } from "@/components/motion";
import { formatRupiah } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Order {
  id: string; productName: string; targetData: string;
  status: string; cost: number; serviceCategory: string; createdAt: string;
}

interface Props {
  greet: string; userName: string; balance: number;
  totalOrders: number; successOrders: number;
  referralCode: string; recentOrders: Order[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SUCCESS:   { label: "Selesai", cls: "bg-emerald-100 text-emerald-700" },
    COMPLETED: { label: "Selesai", cls: "bg-emerald-100 text-emerald-700" },
    PENDING:   { label: "Proses",  cls: "bg-amber-100 text-amber-700" },
    ACTIVE:    { label: "Aktif",   cls: "bg-blue-100 text-blue-700" },
    FAILED:    { label: "Gagal",   cls: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Batal",   cls: "bg-zinc-100 text-zinc-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-bold ${s.cls}`}>{s.label}</span>;
}

const GRADIENTS = [
  "linear-gradient(135deg,#4F46E5 0%,#7C3AED 60%,#EC4899 100%)",
  "linear-gradient(135deg,#059669 0%,#0891B2 100%)",
  "linear-gradient(135deg,#F59E0B 0%,#EF4444 100%)",
];
const LABELS = ["OTP Instan", "PPOB Terlengkap", "Bonus Referral"];

function BannerCarousel({ bannerUrls, greet, userName, balance }: {
  bannerUrls: string[]; greet: string; userName: string; balance: number;
}) {
  const [active, setActive] = useState(0);
  const imgs = bannerUrls.filter(Boolean);
  const total = imgs.length > 0 ? imgs.length : 3;

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => setActive((i) => (i + 1) % total), 4000);
    return () => clearInterval(t);
  }, [total]);

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 176 }}>
      <AnimatePresence mode="wait">
        {imgs.length > 0 ? (
          <motion.div key={active} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0">
            <img src={imgs[active]} alt="Banner" className="w-full h-full object-cover rounded-2xl" />
            <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(to right,rgba(0,0,0,0.55) 0%,transparent 65%)" }} />
            <div className="absolute bottom-0 left-0 p-5">
              <p className="text-xs text-white/70">{greet}, {userName} 👋</p>
              <p className="text-2xl font-black text-white">{formatRupiah(balance)}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key={active} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.4 }}
            className="absolute inset-0 rounded-2xl flex flex-col justify-between p-6"
            style={{ background: GRADIENTS[active % 3] }}>
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/[0.07]" />
            <div className="absolute right-12 bottom-4 h-24 w-24 rounded-full bg-white/[0.05]" />
            <p className="relative text-[10px] font-bold text-white/60 uppercase tracking-widest">
              NOKOSKU — {LABELS[active % 3]}
            </p>
            <div className="relative">
              <p className="text-[10px] text-white/50 mb-0.5">Saldo tersedia</p>
              <p className="text-4xl font-black text-white tracking-tight">{formatRupiah(balance)}</p>
              <p className="text-xs text-white/60 mt-0.5">{greet}, {userName} 👋</p>
              <motion.div whileTap={{ scale: 0.96 }} className="inline-block mt-4">
                <Link href="/deposit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold text-white border border-white/20 hover:bg-white/25 transition-colors">
                  <Wallet className="h-3.5 w-3.5" /> Isi Saldo
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {total > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5 z-10">
          {Array.from({ length: total }).map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className="transition-all duration-300"
              style={{ width: i === active ? 20 : 6, height: 6, borderRadius: 3, background: i === active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceStatusWidget() {
  const services = [
    { name: "OTP Virtual Number", ok: true, latency: "~2s" },
    { name: "PPOB & Pulsa",       ok: true, latency: "~3s" },
    { name: "Deposit Pakasir",    ok: true, latency: "~1s" },
    { name: "Notifikasi SMS",     ok: false, latency: "—" },
  ];
  return (
    <div className="rounded-2xl p-4 bg-white" style={{ boxShadow: "0 2px 12px rgba(14,30,62,0.06)", border: "1px solid rgba(14,30,62,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-bold text-foreground">Status Layanan</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Sistem aktif
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {services.map((s) => (
          <div key={s.name} className="flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: "rgba(14,30,62,0.025)" }}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.ok ? "bg-emerald-500" : "bg-amber-400"}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-foreground truncate">{s.name}</p>
              <p className="text-[9px] text-muted-foreground">{s.latency}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardAnimations({ greet, userName, balance, totalOrders, successOrders, referralCode, recentOrders }: Props) {
  const { data: publicConfig } = useSWR("/api/appconfig/public", fetcher, { revalidateOnFocus: false });
  const bannerUrls = [publicConfig?.banner_url_1 ?? "", publicConfig?.banner_url_2 ?? ""].filter(Boolean);
  const router = useRouter();
  const [copying, setCopying] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(referralCode).then(() => { setCopying(true); setTimeout(() => setCopying(false), 1500); });
  }, [referralCode]);

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-3 pb-2">

      {/* 1. Banner Carousel */}
      <motion.div variants={staggerItem}>
        <BannerCarousel bannerUrls={bannerUrls} greet={greet} userName={userName} balance={balance} />
      </motion.div>

      {/* 2. Quick Stats — 3 compact cards */}
      <motion.div variants={staggerItem} className="grid grid-cols-3 gap-2">
        {[
          { label: "Pesanan", value: totalOrders, Icon: ShoppingBag, color: "text-primary", bg: "bg-primary/10" },
          { label: "Berhasil", value: successOrders, Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Pending", value: totalOrders - successOrders, Icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
        ].map((stat, i) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.08 + i * 0.05 }}
            className="flex flex-col items-center justify-center rounded-2xl py-3 px-1 bg-white"
            style={{ boxShadow: "0 1px 8px rgba(14,30,62,0.06)", border: "1px solid rgba(14,30,62,0.05)" }}>
            <div className={`flex h-7 w-7 items-center justify-center rounded-xl mb-1.5 ${stat.bg}`}>
              <stat.Icon className={`h-3.5 w-3.5 ${stat.color}`} />
            </div>
            <p className="text-xl font-black text-foreground leading-none">{stat.value}</p>
            <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* 3. Service Status */}
      <motion.div variants={staggerItem}><ServiceStatusWidget /></motion.div>

      {/* 4. Quick Actions */}
      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-2.5">
        {[
          { href: "/otp", Icon: Smartphone, label: "Jasa OTP", desc: "100+ negara", ibg: "bg-primary/10", ic: "text-primary" },
          { href: "/ppob", Icon: Wifi, label: "Layanan PPOB", desc: "Pulsa, PLN, game", ibg: "bg-emerald-100", ic: "text-emerald-600" },
        ].map((item) => (
          <motion.div key={item.href} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}>
            <Link href={item.href}
              className="group flex items-center gap-3 rounded-2xl p-4 bg-white transition-all hover:shadow-md"
              style={{ boxShadow: "0 1px 8px rgba(14,30,62,0.06)", border: "1px solid rgba(14,30,62,0.05)" }}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.ibg}`}>
                <item.Icon className={`h-5 w-5 ${item.ic}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground leading-tight">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* 5. Referral Chip */}
      {referralCode && referralCode !== "—" && (
        <motion.div variants={staggerItem}
          className="flex items-center justify-between rounded-2xl px-4 py-3 bg-white"
          style={{ boxShadow: "0 1px 8px rgba(14,30,62,0.06)", border: "1px solid rgba(79,70,229,0.12)" }}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100">
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">Kode Referral</p>
              <p className="text-sm font-black text-foreground font-mono tracking-wider">{referralCode}</p>
            </div>
          </div>
          <button onClick={handleCopy}
            className={`rounded-xl px-3 py-1.5 text-[11px] font-bold transition-all ${copying ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            {copying ? "Disalin!" : "Salin"}
          </button>
        </motion.div>
      )}

      {/* 6. Recent Orders */}
      <motion.div variants={staggerItem}
        className="rounded-2xl overflow-hidden bg-white"
        style={{ boxShadow: "0 1px 8px rgba(14,30,62,0.06)", border: "1px solid rgba(14,30,62,0.05)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <h3 className="text-sm font-bold text-foreground">Pesanan Terbaru</h3>
          <Link href="/history" className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline">
            Lihat semua <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-8 text-center">
            <Smartphone className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada pesanan</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Mulai dengan membeli OTP atau PPOB</p>
          </div>
        ) : (
          <div>
            {recentOrders.map((order, i) => (
              <motion.div key={order.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i }}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: order.serviceCategory === "OTP" ? "rgba(79,70,229,0.1)" : "rgba(5,150,105,0.1)" }}>
                  {order.serviceCategory === "OTP"
                    ? <Smartphone className="h-4 w-4 text-primary" />
                    : <Wifi className="h-4 w-4 text-emerald-600" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{order.productName}</p>
                  <p className="truncate text-[11px] text-muted-foreground font-mono">{order.targetData}</p>
                </div>
                <div className="shrink-0 text-right">
                  <StatusBadge status={order.status} />
                  <p className="text-xs font-bold text-foreground mt-0.5">{formatRupiah(order.cost)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
