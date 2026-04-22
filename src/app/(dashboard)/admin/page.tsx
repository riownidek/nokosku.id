"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Users, TrendingUp, Receipt, ShieldCheck, ShieldBan,
  Edit2, Key, Image, Bell, History, Plus, Minus, Search, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { staggerContainer, staggerItem } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
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

// ── CARD WRAPPER ──────────────────────────────────────────────────────────────
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

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: reports, isLoading: loadingReports } = useSWR("/api/admin/reports", fetcher);
  const { data: usersData, mutate: mutateUsers } = useSWR("/api/admin/users?limit=50", fetcher);
  const { data: settings, mutate: mutateSettings } = useSWR("/api/admin/settings", fetcher);
  const { data: appConfigs, mutate: mutateConfigs } = useSWR("/api/admin/appconfig", fetcher);

  // Settings state
  const [markupPercent, setMarkupPercent] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // AppConfig state
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState("");

  // Balance manager state
  const [balanceUserId, setBalanceUserId] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Global history state
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const { data: allOrders, isLoading: loadingOrders, mutate: mutateOrders } = useSWR(
    `/api/admin/all-orders?search=${orderSearch}&status=${orderStatus}&limit=30`,
    fetcher,
    { refreshInterval: 15000 }
  );

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
    } catch { toast.error("Gagal memperbarui pengaturan"); }
    finally { setIsUpdating(false); }
  };

  const handleSaveConfig = async (key: string, label: string, group: string) => {
    setSavingConfig(key);
    try {
      const res = await fetch("/api/admin/appconfig", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: configValues[key] ?? "", label, group }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${label} berhasil disimpan!`);
      mutateConfigs();
    } catch { toast.error("Gagal menyimpan konfigurasi"); }
    finally { setSavingConfig(""); }
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
    } catch { toast.error("Gagal mengubah status"); }
  };

  const handleBalanceAction = async (type: "add" | "deduct") => {
    if (!balanceUserId || !balanceAmount) {
      toast.error("Pilih user dan masukkan jumlah saldo");
      return;
    }
    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${balanceUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: type === "add" ? "topup" : "deduct",
          amount: Number(balanceAmount),
          note: balanceNote || (type === "add" ? "Top-up manual oleh Admin" : "Pengurangan manual oleh Admin"),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Saldo berhasil di${type === "add" ? "tambah" : "kurangi"}!`);
      mutateUsers();
      setBalanceAmount("");
      setBalanceNote("");
    } catch { toast.error("Gagal mengubah saldo"); }
    finally { setBalanceLoading(false); }
  };

  const getConfigValue = (key: string) => {
    if (configValues[key] !== undefined) return configValues[key];
    const found = appConfigs?.find((c: any) => c.key === key);
    return found?.value ?? "";
  };

  const financeCards = [
    { label: "Total Deposit", value: reports?.finance?.totalDeposit ?? 0, icon: TrendingUp, color: "text-primary bg-primary/10", isCurrency: true },
    { label: "Pengeluaran API", value: reports?.finance?.totalApiSpend ?? 0, icon: Receipt, color: "text-red-500 bg-red-100", isCurrency: true },
    { label: "Estimasi Profit", value: reports?.finance?.grossProfit ?? 0, icon: TrendingUp, color: "text-emerald-600 bg-emerald-100", isCurrency: true },
    { label: "User Aktif", value: reports?.overview?.activeUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-100", isCurrency: false },
  ];

  const configFields = [
    { key: "rumahotp_api_key", label: "RumahOTP API Key", group: "api", placeholder: "Masukkan API Key RumahOTP..." },
    { key: "pakasir_api_key", label: "Pakasir API Key", group: "api", placeholder: "Masukkan API Key Pakasir..." },
    { key: "banner_url_1", label: "Banner URL 1", group: "visual", placeholder: "https://..." },
    { key: "banner_url_2", label: "Banner URL 2", group: "visual", placeholder: "https://..." },
    { key: "popup_title", label: "Judul Popup Pengumuman", group: "popup", placeholder: "Judul pengumuman..." },
    { key: "popup_content", label: "Isi Popup Pengumuman", group: "popup", placeholder: "Isi pengumuman..." },
    { key: "popup_active", label: "Aktifkan Popup? (true/false)", group: "popup", placeholder: "true" },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Panel Administrasi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola pengguna, konfigurasi API, dan pantau platform.</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto gap-1 rounded-xl bg-muted p-1 mb-6">
            {["overview","users","history","settings","appconfig"].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-lg text-xs font-semibold px-3 py-1.5">
                {{ overview: "Laporan", users: "Pengguna", history: "Riwayat Global", settings: "Pengaturan", appconfig: "App Config" }[t]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── LAPORAN ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            </div>
          </TabsContent>

          {/* ── PENGGUNA + BALANCE MANAGER ── */}
          <TabsContent value="users" className="space-y-4">
            {/* Balance Manager */}
            <Card>
              <p className="font-bold text-foreground mb-4">Kelola Saldo Pengguna</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pilih User</label>
                  <select
                    value={balanceUserId}
                    onChange={(e) => setBalanceUserId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">-- Pilih User --</option>
                    {usersData?.users?.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name ?? u.email} ({formatRupiah(u.balance)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Jumlah (Rp)</label>
                  <input
                    type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)}
                    placeholder="50000"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Catatan (opsional)</label>
                  <input
                    type="text" value={balanceNote} onChange={(e) => setBalanceNote(e.target.value)}
                    placeholder="Bonus referral..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => handleBalanceAction("add")} disabled={balanceLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {balanceLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Tambah
                  </button>
                  <button
                    onClick={() => handleBalanceAction("deduct")} disabled={balanceLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-500 px-3 py-2.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {balanceLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />} Kurangi
                  </button>
                </div>
              </div>
            </Card>

            {/* User List */}
            <Card className="overflow-hidden !p-0">
              <div className="border-b border-border px-5 py-4">
                <p className="font-bold text-foreground">Daftar Pengguna ({usersData?.users?.length ?? 0})</p>
              </div>
              <div className="divide-y divide-border/50">
                {usersData?.users?.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
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
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold">{formatRupiah(user.balance)}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${user.isBlocked ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>
                        {user.isBlocked ? "Blocked" : "Active"}
                      </span>
                      {user.role !== "ADMIN" && (
                        <button
                          onClick={() => handleBlockAction(user.id, user.isBlocked)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${user.isBlocked ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                        >
                          {user.isBlocked ? <><ShieldCheck className="inline h-3 w-3 mr-1" />Aktifkan</> : <><ShieldBan className="inline h-3 w-3 mr-1" />Blokir</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ── RIWAYAT GLOBAL ── */}
          <TabsContent value="history" className="space-y-4">
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
          </TabsContent>

          {/* ── PENGATURAN ── */}
          <TabsContent value="settings">
            <div className="max-w-lg space-y-4">
              {[
                { key: "markup_percent", label: "Markup Harga Jual (%)", value: markupPercent, onChange: setMarkupPercent, desc: "Persentase markup dari harga asli API.", suffix: "%" },
                { key: "referral_commission_percent", label: "Komisi Referral (%)", value: commissionPercent, onChange: setCommissionPercent, desc: "Komisi dari deposit referral.", suffix: "%" },
              ].map((setting, i) => (
                <motion.div key={setting.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card>
                    <p className="font-bold text-foreground">{setting.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 mb-3">{setting.desc}</p>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 max-w-[160px]">
                        <input
                          type="number" min="0" max="100" value={setting.value}
                          onChange={(e) => setting.onChange(e.target.value)}
                          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 pr-8 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">{setting.suffix}</span>
                      </div>
                      <button
                        onClick={() => handleUpdateSetting(setting.key, setting.value)}
                        disabled={isUpdating}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />} Simpan
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ── APP CONFIG ── */}
          <TabsContent value="appconfig" className="space-y-6">
            {[
              { group: "api", label: "API Keys", icon: Key, fields: configFields.filter((f) => f.group === "api") },
              { group: "visual", label: "Manajemen Banner", icon: Image, fields: configFields.filter((f) => f.group === "visual") },
              { group: "popup", label: "Popup Pengumuman", icon: Bell, fields: configFields.filter((f) => f.group === "popup") },
            ].map((section) => (
              <div key={section.group}>
                <div className="flex items-center gap-2 mb-3">
                  <section.icon className="h-4 w-4 text-primary" />
                  <p className="font-bold text-foreground">{section.label}</p>
                </div>
                <div className="space-y-3">
                  {section.fields.map((field) => (
                    <Card key={field.key} className="!p-4">
                      <label className="text-xs font-bold text-muted-foreground block mb-2">{field.label}</label>
                      <div className="flex gap-2">
                        <input
                          type={field.key.includes("key") ? "password" : "text"}
                          value={getConfigValue(field.key)}
                          onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <button
                          onClick={() => handleSaveConfig(field.key, field.label, field.group)}
                          disabled={savingConfig === field.key}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0"
                        >
                          {savingConfig === field.key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Edit2 className="h-3 w-3" />} Simpan
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
