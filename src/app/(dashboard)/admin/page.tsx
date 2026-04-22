"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, TrendingUp, Receipt, ShieldCheck, ShieldBan, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { staggerContainer, staggerItem, SkeletonCard } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminPage() {
  const { data: reports, isLoading: loadingReports } = useSWR("/api/admin/reports", fetcher);
  const { data: usersData, mutate: mutateUsers } = useSWR("/api/admin/users?limit=50", fetcher);
  const { data: settings, mutate: mutateSettings } = useSWR("/api/admin/settings", fetcher);

  const [markupPercent, setMarkupPercent] = useState<string>("");
  const [commissionPercent, setCommissionPercent] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Populate from settings once loaded
  if (settings && !markupPercent) {
    const m = settings.find((s: any) => s.key === "markup_percent");
    const c = settings.find((s: any) => s.key === "referral_commission_percent");
    if (m) setMarkupPercent(m.value);
    if (c) setCommissionPercent(c.value);
  }

  const handleUpdateSetting = async (key: string, value: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Pengaturan berhasil diperbarui!");
      mutateSettings();
    } catch {
      toast.error("Gagal memperbarui pengaturan");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBlockAction = async (userId: string, isBlocked: boolean) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isBlocked ? "unblock" : "block" }),
      });
      toast.success(`User berhasil di${isBlocked ? "unblock" : "block"}`);
      mutateUsers();
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  const financeCards = [
    { label: "Total Deposit Masuk", value: reports?.finance?.totalDeposit ?? 0, icon: TrendingUp, color: "text-primary bg-primary/10", isCurrency: true },
    { label: "Pengeluaran API", value: reports?.finance?.totalApiSpend ?? 0, icon: Receipt, color: "text-red-500 bg-red-100", isCurrency: true },
    { label: "Estimasi Profit", value: reports?.finance?.grossProfit ?? 0, icon: TrendingUp, color: "text-emerald-600 bg-emerald-100", isCurrency: true },
    { label: "User Aktif (30h)", value: reports?.overview?.activeUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-100", isCurrency: false },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={staggerItem}>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Panel Administrasi</h1>
        <p className="mt-1.5 text-muted-foreground">Kelola pengguna, markup harga, dan pantau performa finansial platform.</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Tabs defaultValue="overview">
          <TabsList className="h-11 rounded-xl bg-muted p-1 mb-6">
            <TabsTrigger value="overview" className="rounded-lg text-sm font-semibold px-5">Laporan</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg text-sm font-semibold px-5">Pengguna</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg text-sm font-semibold px-5">Pengaturan</TabsTrigger>
          </TabsList>

          {/* LAPORAN */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {financeCards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 350, damping: 28 }}
                  className="rounded-2xl border border-border bg-card p-5"
                >
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
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* PENGGUNA */}
          <TabsContent value="users">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-5 py-4">
                <p className="font-bold text-foreground">Daftar Pengguna</p>
              </div>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                className="divide-y divide-border/50"
              >
                {usersData?.users?.map((user: any) => (
                  <motion.div
                    key={user.id}
                    variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } }}
                    className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                        {(user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {user.name}
                          {user.role === "ADMIN" && <span className="ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-primary/10 text-primary">ADMIN</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold">{formatRupiah(user.balance)}</span>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${user.isBlocked ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                        {user.isBlocked ? "Blocked" : "Active"}
                      </span>
                      {user.role !== "ADMIN" && (
                        <motion.button
                          onClick={() => handleBlockAction(user.id, user.isBlocked)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                            user.isBlocked
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                        >
                          {user.isBlocked ? <><ShieldCheck className="inline h-3 w-3 mr-1" />Aktifkan</> : <><ShieldBan className="inline h-3 w-3 mr-1" />Blokir</>}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </TabsContent>

          {/* PENGATURAN */}
          <TabsContent value="settings">
            <div className="max-w-lg space-y-4">
              {[
                { key: "markup_percent", label: "Markup Harga Jual (%)", value: markupPercent, onChange: setMarkupPercent, desc: "Persentase markup dari harga asli API. Misal: 10 = harga naik 10%." },
                { key: "referral_commission_percent", label: "Komisi Referral (%)", value: commissionPercent, onChange: setCommissionPercent, desc: "Persentase komisi dari jumlah deposit yang diterima referrer." },
              ].map((setting, i) => (
                <motion.div
                  key={setting.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 350, damping: 28 }}
                  className="rounded-2xl border border-border bg-card p-5 space-y-3"
                >
                  <div>
                    <p className="font-bold text-foreground">{setting.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{setting.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[160px]">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={setting.value}
                        onChange={e => setting.onChange(e.target.value)}
                        className="block w-full rounded-xl border border-input bg-background px-4 py-2.5 pr-8 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                    </div>
                    <motion.button
                      onClick={() => handleUpdateSetting(setting.key, setting.value)}
                      disabled={isUpdating}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />}
                      Simpan
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
