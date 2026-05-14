"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { Edit2, Key, Image, Bell, Loader2, Mail, RefreshCw, TrendingUp } from "lucide-react";
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

export default function AdminConfigPage() {
  const { data: settings, mutate: mutateSettings } = useSWR("/api/admin/settings", fetcher);
  const { data: appConfigs, mutate: mutateConfigs } = useSWR("/api/admin/appconfig", fetcher);

  const [markupPercent, setMarkupPercent] = useState("0");
  const [markupPpobAmount, setMarkupPpobAmount] = useState("0");
  const [commissionPercent, setCommissionPercent] = useState("0");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing]   = useState(false);

  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState("");

  // ── Init state dari data fetched — gunakan useEffect agar tidak crash ────
  useEffect(() => {
    if (!settings) return;
    const m = settings.find((s: any) => s.key === "markup_percent");
    const c = settings.find((s: any) => s.key === "referral_commission_percent");
    const p = settings.find((s: any) => s.key === "markup_ppob_percent");
    if (m?.value !== undefined) setMarkupPercent(m.value);
    if (c?.value !== undefined) setCommissionPercent(c.value);
    if (p?.value !== undefined) setMarkupPpobAmount(p.value);
  }, [settings]);

  const handleSyncRate = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-rate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal sinkronisasi");
      toast.success(data.message ?? "Kurs berhasil diperbarui!");
      mutateConfigs(); // refresh tampilan nilai di form
    } catch (err: any) {
      toast.error(err.message ?? "Gagal sinkronisasi kurs");
    } finally {
      setIsSyncing(false);
    }
  };

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

  const getConfigValue = (key: string) => {
    if (configValues[key] !== undefined) return configValues[key];
    const found = appConfigs?.find((c: any) => c.key === key);
    return found?.value ?? "";
  };

  const configFields = [
    { key: "herosms_api_key",  label: "Hero-SMS API Key",         group: "api",   placeholder: "Masukkan API Key Hero-SMS..." },
    { key: "pakasir_api_key",  label: "Pakasir API Key",           group: "api",   placeholder: "Masukkan API Key Pakasir..." },
    { key: "pakasir_project",  label: "Pakasir Project Name",      group: "api",   placeholder: "Nama proyek (Slug) di Pakasir..." },
    { key: "usd_to_idr_rate",  label: "Kurs USD → IDR",            group: "api",   placeholder: "Contoh: 16000" },
    { key: "banner_url_1",     label: "Banner URL 1",              group: "visual", placeholder: "https://..." },
    { key: "banner_url_2",     label: "Banner URL 2",              group: "visual", placeholder: "https://..." },
    { key: "popup_title",      label: "Judul Popup Pengumuman",    group: "popup",  placeholder: "Judul pengumuman..." },
    { key: "popup_content",    label: "Isi Popup Pengumuman",      group: "popup",  placeholder: "Isi pengumuman..." },
    { key: "popup_active",     label: "Aktifkan Popup? (true/false)", group: "popup", placeholder: "true" },
    { key: "google_email",     label: "Google Email (SMTP)",       group: "smtp",   placeholder: "email@gmail.com" },
    { key: "google_app_password", label: "Google App Password",    group: "smtp",   placeholder: "16 digit sandi aplikasi..." },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-black tracking-tight text-foreground">App Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola kredensial API, markup harga, dan tampilan website.</p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── KURS USD → IDR (Real-time) ── */}
        <motion.div variants={staggerItem}>
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="font-bold text-foreground">Kurs USD → IDR (Real-time)</p>
              </div>
              <button
                onClick={handleSyncRate}
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                {isSyncing
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Menyinkronkan...</>
                  : <><RefreshCw className="h-3 w-3" /> Sinkronkan Kurs Sekarang</>
                }
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Nilai kurs diambil otomatis dari <code className="text-xs bg-muted px-1 py-0.5 rounded">open.er-api.com</code> dan di-cache selama 6 jam.
              Klik &ldquo;Sinkronkan&rdquo; untuk memperbarui manual.
            </p>
            {(() => {
              const rateRecord = appConfigs?.find((c: any) => c.key === "usd_to_idr_rate");
              const rateValue  = rateRecord?.value ? parseFloat(rateRecord.value) : null;
              const updatedAt  = rateRecord?.updatedAt ? new Date(rateRecord.updatedAt) : null;
              return (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nilai Kurs Aktif</span>
                    <span className="text-lg font-black text-emerald-700">
                      {rateValue
                        ? `1 USD = Rp ${rateValue.toLocaleString("id-ID")}`
                        : <span className="text-amber-600 text-sm">Belum ada data (fallback: Rp 16.000)</span>
                      }
                    </span>
                  </div>
                  {updatedAt && (
                    <p className="text-xs text-muted-foreground text-right">
                      Terakhir diperbarui: {updatedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                </div>
              );
            })()}
          </Card>
        </motion.div>

        {/* ── PENGATURAN HARGA & KOMISI ── */}
        <motion.div variants={staggerItem} className="space-y-4">
          {[
            { key: "markup_percent", label: "Markup Harga Jual OTP (%)", value: markupPercent, onChange: setMarkupPercent, desc: "Persentase markup dari harga asli Hero-SMS untuk layanan OTP.", suffix: "%" },
            { key: "markup_ppob_percent", label: "Markup Harga Jual PPOB (Rp)", value: markupPpobAmount, onChange: setMarkupPpobAmount, desc: "Tambahan harga (Rp) dari harga asli Jagoanpedia untuk layanan PPOB.", suffix: "Rp" },
            { key: "referral_commission_percent", label: "Komisi Referral (%)", value: commissionPercent, onChange: setCommissionPercent, desc: "Komisi dari deposit referral.", suffix: "%" },
          ].map((setting) => (
            <Card key={setting.key}>
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
          ))}

          {/* Minimal Deposit — disimpan ke AppConfig via getConfigValue pattern */}
          <Card>
            <p className="font-bold text-foreground">Minimal Deposit (Rp)</p>
            <p className="text-sm text-muted-foreground mt-0.5 mb-3">Nominal minimum yang dapat di-deposit oleh pengguna. Default: Rp 10.000.</p>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-[180px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">Rp</span>
                <input
                  type="number" min="1000" step="1000"
                  value={getConfigValue("min_deposit_amount") || "10000"}
                  onChange={(e) => setConfigValues((prev) => ({ ...prev, min_deposit_amount: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                onClick={() => handleSaveConfig("min_deposit_amount", "Minimal Deposit (Rp)", "api")}
                disabled={savingConfig === "min_deposit_amount"}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {savingConfig === "min_deposit_amount" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit2 className="h-4 w-4" />} Simpan
              </button>
            </div>
          </Card>
        </motion.div>

        {/* ── KREDENSIAL API DLL ── */}
        <motion.div variants={staggerItem} className="space-y-6">
          {[
            { group: "api", label: "API Keys", icon: Key, fields: configFields.filter((f) => f.group === "api") },
            { group: "smtp", label: "Konfigurasi SMTP Email", icon: Mail, fields: configFields.filter((f) => f.group === "smtp") },
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
        </motion.div>
      </div>
    </motion.div>
  );
}
