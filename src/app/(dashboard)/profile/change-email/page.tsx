"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ChangeEmailPage() {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!newEmail.trim() || !password) return toast.error("Semua kolom wajib diisi");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return toast.error("Format email tidak valid");

    setLoading(true);
    try {
      const res = await fetch("/api/profile/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      toast.success("Email berhasil diubah! Silakan login ulang.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" /> Ubah Email
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ganti alamat email akun Anda</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-4">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-base font-black text-foreground">Email berhasil diubah</p>
            <p className="text-sm text-muted-foreground">Silakan login kembali dengan email baru Anda.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Email Baru</label>
              <input
                type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@baru.com"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Password Saat Ini</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Password diperlukan untuk verifikasi keamanan perubahan email.</p>
            <button onClick={handleSubmit} disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-40 hover:bg-primary/90 transition-colors">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : <><Mail className="h-4 w-4" /> Ubah Email</>}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
