"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowDownCircle, ArrowUpCircle, RotateCcw, Award } from "lucide-react";
import { staggerContainer, staggerItem, SkeletonRow } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SUCCESS: { label: "Berhasil", cls: "bg-emerald-100 text-emerald-700" },
    COMPLETED: { label: "Berhasil", cls: "bg-emerald-100 text-emerald-700" },
    PENDING: { label: "Proses", cls: "bg-amber-100 text-amber-700" },
    ACTIVE: { label: "Aktif", cls: "bg-blue-100 text-blue-700" },
    FAILED: { label: "Gagal", cls: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Batal", cls: "bg-zinc-100 text-zinc-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; icon: any; cls: string }> = {
    DEPOSIT: { label: "Deposit", icon: ArrowDownCircle, cls: "text-emerald-600" },
    DEDUCTION: { label: "Pembelian", icon: ArrowUpCircle, cls: "text-red-500" },
    REFUND: { label: "Refund", icon: RotateCcw, cls: "text-blue-600" },
    COMMISSION: { label: "Komisi", icon: Award, cls: "text-amber-600" },
  };
  const s = map[type] ?? { label: type, icon: ArrowUpCircle, cls: "text-muted-foreground" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${s.cls}`}>
      <s.icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

function isCredit(type: string) {
  return type === "DEPOSIT" || type === "REFUND" || type === "COMMISSION";
}

export default function HistoryPage() {
  const { data: ordersData, isLoading: loadingOrders } = useSWR("/api/orders?limit=100", fetcher);
  const { data: trxData, isLoading: loadingTrx } = useSWR("/api/transactions?limit=100", fetcher);

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={staggerItem}>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Riwayat Aktivitas</h1>
        <p className="mt-1.5 text-muted-foreground">Seluruh pesanan layanan dan mutasi saldo akun Anda.</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="h-11 rounded-xl bg-muted p-1 max-w-xs">
            <TabsTrigger value="orders" className="rounded-lg text-sm font-semibold flex-1">Pesanan</TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-lg text-sm font-semibold flex-1">Mutasi Saldo</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="font-bold text-foreground">Riwayat Pesanan</p>
                <p className="text-sm text-muted-foreground mt-0.5">OTP dan PPOB terbaru</p>
              </div>
              {loadingOrders ? (
                <div className="divide-y divide-border/50">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : !ordersData?.orders?.length ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">📂</p>
                  <p className="font-semibold">Belum ada pesanan</p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                  className="divide-y divide-border/50"
                >
                  {ordersData.orders.map((o: any) => (
                    <motion.div
                      key={o.id}
                      variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } }}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{o.productName}</p>
                        <p className="truncate text-xs text-muted-foreground font-mono mt-0.5">{o.targetData}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground">{o.serviceCategory}</span>
                        <StatusBadge status={o.status} />
                        <span className="text-sm font-bold">{formatRupiah(o.cost)}</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="font-bold text-foreground">Mutasi Saldo</p>
                <p className="text-sm text-muted-foreground mt-0.5">Deposit, pembelian, refund, dan komisi referral</p>
              </div>
              {loadingTrx ? (
                <div className="divide-y divide-border/50">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : !trxData?.transactions?.length ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p className="text-4xl mb-3">💳</p>
                  <p className="font-semibold">Belum ada mutasi</p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                  className="divide-y divide-border/50"
                >
                  {trxData.transactions.map((t: any) => (
                    <motion.div
                      key={t.id}
                      variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } }}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <TypeBadge type={t.type} />
                        {t.note && <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xs">{t.note}</p>}
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {new Date(t.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={t.status} />
                        <span className={`text-sm font-bold tabular-nums ${isCredit(t.type) ? "text-emerald-600" : "text-foreground"}`}>
                          {isCredit(t.type) ? "+" : "-"}{formatRupiah(t.amount)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
