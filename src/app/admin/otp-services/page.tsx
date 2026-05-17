"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Flame, Check, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface OtpService {
  id: string;
  name: string;
  code: string;
  emoji: string;
  isHot: boolean;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_FORM = { name: "", code: "", emoji: "📱", isHot: false, sortOrder: 0 };
const API = "/api/admin/otp-services";

export default function OtpServicesAdminPage() {
  const { data: services, isLoading } = useSWR<OtpService[]>(API, fetcher);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = () => mutate(API);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error("Nama dan kode wajib diisi"); return; }
    setSaving(true);
    try {
      const url  = editId ? `${API}/${editId}` : API;
      const method = editId ? "PATCH" : "POST";
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success(editId ? "Layanan diperbarui" : "Layanan ditambahkan");
      setForm(EMPTY_FORM);
      setEditId(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (svc: OtpService) => {
    setEditId(svc.id);
    setForm({ name: svc.name, code: svc.code, emoji: svc.emoji, isHot: svc.isHot, sortOrder: svc.sortOrder });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus layanan ini?")) return;
    setDeletingId(id);
    try {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      toast.success("Layanan dihapus");
      refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (svc: OtpService) => {
    await fetch(`${API}/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !svc.isActive }),
    });
    refresh();
  };

  return (
    <div className="space-y-6 max-w-2xl pb-20">
      <div>
        <h1 className="text-2xl font-black text-foreground">Manajemen Layanan OTP</h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola daftar layanan pilihan cepat yang tampil di halaman OTP pengguna.</p>
      </div>

      {/* ── Form tambah/edit ── */}
      <motion.div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-bold text-base">{editId ? "✏️ Edit Layanan" : "➕ Tambah Layanan Baru"}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nama Layanan</label>
              <input
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="WhatsApp"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Kode API Hero-SMS</label>
              <input
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="wa"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Emoji / Ikon</label>
              <input
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="💬"
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Urutan Tampil</label>
              <input
                type="number"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setForm({ ...form, isHot: !form.isHot })}
              className={`w-9 h-5 rounded-full flex items-center transition-colors ${form.isHot ? "bg-orange-500" : "bg-muted"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow mx-0.5 transition-transform ${form.isHot ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-sm font-semibold flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> Tandai sebagai HOT
            </span>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editId ? "Simpan Perubahan" : "Tambahkan"}
            </button>
            {editId && (
              <button type="button" onClick={() => { setEditId(null); setForm(EMPTY_FORM); }}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:bg-muted transition-colors">
                <X className="h-4 w-4" /> Batal
              </button>
            )}
          </div>
        </form>
      </motion.div>

      {/* ── Daftar layanan ── */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-5 py-3 flex items-center gap-2">
          <h2 className="font-bold text-sm">Daftar Layanan ({services?.length ?? 0})</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : services?.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Belum ada layanan. Tambahkan di atas.</div>
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence>
              {services?.map((svc) => (
                <motion.div key={svc.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 px-5 py-3">
                  <span className="text-2xl w-8 text-center">{svc.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{svc.name}</span>
                      {svc.isHot && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">
                          <Flame className="h-2.5 w-2.5" /> HOT
                        </span>
                      )}
                      {!svc.isActive && (
                        <span className="text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Nonaktif</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">code: {svc.code} · urutan: {svc.sortOrder}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleActive(svc)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${svc.isActive ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700" : "bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-700"}`}>
                      {svc.isActive ? "Aktif" : "Off"}
                    </button>
                    <button onClick={() => handleEdit(svc)}
                      className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(svc.id)} disabled={deletingId === svc.id}
                      className="p-2 rounded-xl hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                      {deletingId === svc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
