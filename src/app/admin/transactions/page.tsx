"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";
import { staggerContainer, staggerItem } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUCCESS: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    FAILED: "bg-red-100 text-red-600",
    CANCELLED: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${map[status] ?? "bg-zinc-100 text-zinc-600"}`}>
      {status}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 ${className}`}
      style={{ boxShadow: "0 2px 12px rgba(14,30,62,0.07)", border: "1px solid rgba(14,30,62,0.06)" }}
    >
      {children}
    </div>
  );
}

export default function AdminTransactionsPage() {
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const { data: allOrders, isLoading: loadingOrders, mutate: mutateOrders } = useSWR(
    `/api/admin/all-orders?search=${orderSearch}&status=${orderStatus}&limit=30`,
    fetcher,
    { refreshInterval: 15000 }
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Log Transaksi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pantau seluruh riwayat transaksi pesanan dan deposit.</p>
      </motion.div>

      <motion.div variants={staggerItem} className="space-y-4">
        <Card className="!p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Cari email, ID pesanan, nomor..."
                className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <select
              value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Semua Status</option>
              {["PENDING","ACTIVE","SUCCESS","COMPLETED","FAILED","CANCELLED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button onClick={() => mutateOrders()} className="flex items-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-sm font-semibold hover:bg-muted/80">
              <RefreshCw className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </Card>

        <Card className="overflow-hidden !p-0">
          <div className="border-b border-border px-5 py-4 flex items-center justify-between">
            <p className="font-bold text-foreground">Semua Pesanan</p>
            <span className="text-xs text-muted-foreground">Total: {allOrders?.total ?? 0}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["User", "Produk", "Nomor Target", "Status", "Biaya", "Waktu"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loadingOrders ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : allOrders?.orders?.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Tidak ada data</td></tr>
                ) : (
                  allOrders?.orders?.map((order: any) => (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold truncate max-w-[120px]">{order.user?.name ?? order.user?.email}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{order.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold truncate max-w-[140px]">{order.productName}</p>
                        <p className="text-[11px] text-muted-foreground">{order.serviceCategory}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{order.targetData}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 font-bold">{formatRupiah(order.cost)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
