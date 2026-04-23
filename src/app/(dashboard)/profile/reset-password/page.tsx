"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ cur: false, new: false, conf: false });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword)
      return toast.error("Semua kolom wajib diisi");
    if (form.newPassword.length < 8)
      return toast.error("Password baru minimal 8 karakter");
    if (form.newPassword !== form.confirmPassword)
      return toast.error("Konfirmasi password tidak cocok");

    setLoading(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      toast.success("Password berhasil diubah!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, field, showKey, showState }: {
    label: string; field: keyof typeof form;
    showKey: keyof typeof show; showState: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={showState ? "text" : "password"}
          value={form[field]}
          onChange={set(field)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-input bg-background px-4 py-2.5 pr-11 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        <button type="button" onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground">
          {showState ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-primary" /> Reset Password
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ubah kata sandi akun Anda</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-4">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-base font-black text-foreground">Password berhasil diubah</p>
            <p className="text-sm text-muted-foreground">Gunakan password baru Anda saat login berikutnya.</p>
          </div>
        ) : (
          <>
            <InputField label="Password Saat Ini" field="currentPassword" showKey="cur" showState={show.cur} />
            <InputField label="Password Baru" field="newPassword" showKey="new" showState={show.new} />
            <InputField label="Konfirmasi Password Baru" field="confirmPassword" showKey="conf" showState={show.conf} />
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p>• Minimal 8 karakter</p>
              <p>• Kombinasi huruf dan angka direkomendasikan</p>
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-40 hover:bg-primary/90 transition-colors">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : <><KeyRound className="h-4 w-4" /> Ubah Password</>}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
