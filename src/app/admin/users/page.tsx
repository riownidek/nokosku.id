"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Loader2, Plus, Minus, ShieldCheck, ShieldBan } from "lucide-react";
import { toast } from "sonner";
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

export default function AdminUsersPage() {
  const { data: usersData, mutate: mutateUsers } = useSWR("/api/admin/users?limit=100", fetcher);

  // Balance manager state
  const [balanceUserId, setBalanceUserId] = useState("");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);

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

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Manajemen Pengguna</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola daftar pengguna dan top-up saldo manual.</p>
      </motion.div>

      <motion.div variants={staggerItem} className="space-y-4">
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
      </motion.div>
    </motion.div>
  );
}
