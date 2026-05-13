"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowDownCircle, ArrowUpCircle, RotateCcw, Award, XCircle } from "lucide-react";
import { staggerContainer, staggerItem, SkeletonRow } from "@/components/motion";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SUCCESS:   { label: "Berhasil", cls: "bg-emerald-100 text-emerald-700" },
    COMPLETED: { label: "Berhasil", cls: "bg-emerald-100 text-emerald-700" },
    PENDING:   { label: "Proses",   cls: "bg-amber-100 text-amber-700" },
    ACTIVE:    { label: "Aktif",    cls: "bg-blue-100 text-blue-700" },
    WAITING:   { label: "Menunggu", cls: "bg-indigo-100 text-indigo-700" },
    FAILED:    { label: "Gagal",    cls: "bg-red-100 text-red-700" },
    CANCELLED: { label: "Batal",    cls: "bg-zinc-100 text-zinc-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; icon: any; cls: string }> = {
    DEPOSIT:    { label: "Deposit",  icon: ArrowDownCircle, cls: "text-emerald-600" },
    DEDUCTION:  { label: "Pembelian", icon: ArrowUpCircle,  cls: "text-red-500" },
    REFUND:     { label: "Refund",   icon: RotateCcw,       cls: "text-blue-600" },
    COMMISSION: { label: "Komisi",   icon: Award,            cls: "text-amber-600" },
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

function CancelOrderButton({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("Batalkan pesanan ini? Saldo akan dikembalikan ke akun Anda.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/otp/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membatalkan pesanan");
      toast.success(`Pesanan dibatalkan. Saldo Anda dikembalikan ${formatRupiah(data.refunded)}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleCancel}
      disabled={loading}
      className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors shrink-0"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
      Batalkan
    </motion.button>
  );
}

export default function HistoryPage() {
  const { data: ordersData, isLoading: loadingOrders, mutate: mutateOrders } = useSWR("/api/orders?limit=100", fetcher);
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
                <p className="text-sm text-muted-foreground mt-0.5">
                  OTP dan PPOB terbaru
                  <span className="ml-2 text-xs text-blue-600 font-semibold">
                    · Pesanan Aktif/Menunggu dapat dibatalkan untuk mendapatkan refund
                  </span>
                </p>
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
                  {ordersData.orders.map((o: any) => {
                    const canCancel = o.serviceCategory === "OTP" &&
                      (o.status === "ACTIVE" || o.status === "WAITING");
                    return (
                      <motion.div
                        key={o.id}
                        variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } }}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{o.productName}</p>
                          <div className="flex flex-col gap-1 mt-1">
                            <p className="truncate text-xs text-muted-foreground font-mono">Nomor: {o.targetData}</p>
                            {(o.status === "COMPLETED" || o.status === "SUCCESS") && o.resultData && (
                              <p className="truncate text-[11px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                                OTP: <span className="font-black text-emerald-800 text-xs tracking-widest">{o.resultData}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground">
                            {o.serviceCategory}
                          </span>
                          <StatusBadge status={o.status} />
                          <span className="text-sm font-bold">{formatRupiah(o.cost)}</span>
                          {canCancel && (
                            <CancelOrderButton
                              orderId={o.id}
                              onSuccess={() => mutateOrders()}
                            />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
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
