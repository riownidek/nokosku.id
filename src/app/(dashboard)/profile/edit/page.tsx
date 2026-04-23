"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { User, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfileEditPage() {
  const { data: session } = useSession();
  const { data: profile, mutate } = useSWR("/api/profile", fetcher);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const displayName = name || profile?.name || session?.user?.name || "";

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nama tidak boleh kosong"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Profil berhasil diperbarui");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Profil Pengguna
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Perbarui informasi akun Anda</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 space-y-5">

        {/* Avatar */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-violet-600 text-3xl font-black text-white">
            {(displayName[0] ?? "U").toUpperCase()}
          </div>
        </div>

        {/* Nama */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Nama Lengkap</label>
          <input
            type="text"
            placeholder={profile?.name ?? "Masukkan nama Anda"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Email (readonly) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Email</label>
          <input
            type="email" readOnly
            value={profile?.email ?? session?.user?.email ?? ""}
            className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[10px] text-muted-foreground">Email tidak dapat diubah di sini. Gunakan menu "Ubah Email".</p>
        </div>

        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-40 hover:bg-primary/90 transition-colors">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : <><Save className="h-4 w-4" /> Simpan Perubahan</>}
        </button>
      </motion.div>
    </div>
  );
}
