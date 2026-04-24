"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Users, TrendingUp, Receipt } from "lucide-react";
import { staggerContainer, staggerItem } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

export default function AdminPage() {
  const { data: reports, isLoading: loadingReports } = useSWR("/api/admin/reports", fetcher);

  const financeCards = [
    { label: "Total Deposit", value: reports?.finance?.totalDeposit ?? 0, icon: TrendingUp, color: "text-primary bg-primary/10", isCurrency: true },
    { label: "Pengeluaran API", value: reports?.finance?.totalApiSpend ?? 0, icon: Receipt, color: "text-red-500 bg-red-100", isCurrency: true },
    { label: "Estimasi Profit", value: reports?.finance?.grossProfit ?? 0, icon: TrendingUp, color: "text-emerald-600 bg-emerald-100", isCurrency: true },
    { label: "User Aktif", value: reports?.overview?.activeUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-100", isCurrency: false },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Dasbor Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ringkasan finansial dan statistik platform.</p>
      </motion.div>

      <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {financeCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground">{card.label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </div>
              {loadingReports ? (
                <div className="h-7 w-32 rounded-md bg-muted animate-pulse" />
              ) : (
                <p className="text-2xl font-black text-foreground">
                  {card.isCurrency ? formatRupiah(card.value) : card.value}
                </p>
              )}
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
