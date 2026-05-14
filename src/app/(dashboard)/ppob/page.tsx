"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Wifi, Loader2, Search, X, ShoppingCart,
  CheckCircle2, Smartphone, Zap, Tv, Droplets,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/components/motion";
import { mutate as globalMutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Kategori Ikon ─────────────────────────────────────────────────────────
function CategoryIcon({ category }: { category: string }) {
  const cat = category?.toLowerCase() ?? "";
  if (cat.includes("pulsa") || cat.includes("paket") || cat.includes("data"))
    return <Smartphone className="h-5 w-5 text-blue-500" />;
  if (cat.includes("listrik") || cat.includes("pln") || cat.includes("token"))
    return <Zap className="h-5 w-5 text-yellow-500" />;
  if (cat.includes("air") || cat.includes("pdam"))
    return <Droplets className="h-5 w-5 text-cyan-500" />;
  if (cat.includes("tv") || cat.includes("streaming"))
    return <Tv className="h-5 w-5 text-purple-500" />;
  return <Wifi className="h-5 w-5 text-primary" />;
}

// ─── Kartu Layanan ──────────────────────────────────────────────────────────
function ServiceCard({
  service,
  onOrder,
}: {
  service: any;
  onOrder: (service: any) => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      onClick={() => onOrder(service)}
      className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 group-hover:bg-primary/12 transition-colors">
          <CategoryIcon category={service.category} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
            {service.name}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {service.category}
          </p>
          <p className="mt-2 text-base font-black text-primary">
            {formatRupiah(service.displayPrice ?? service.price)}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Modal Pemesanan ────────────────────────────────────────────────────────
function OrderModal({
  service,
  onClose,
  onSuccess,
}: {
  service: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOrder = async () => {
    const t = target.trim();
    if (!t) { toast.error("Masukkan nomor / ID pelanggan tujuan."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ppob/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.service, target: t }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat pesanan");
      toast.success(`✅ Pesanan berhasil! ${service.name} → ${t}`);
      // Refresh saldo
      await globalMutate("/api/profile");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CategoryIcon category={service.category} />
            </div>
            <div>
              <p className="font-black text-foreground text-sm leading-tight max-w-[200px]">
                {service.name}
              </p>
              <p className="text-xs text-muted-foreground">{service.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Harga */}
        <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Biaya</p>
          <p className="text-2xl font-black text-primary">
            {formatRupiah(service.displayPrice ?? service.price)}
          </p>
        </div>

        {/* Input Target */}
        <div className="space-y-2 mb-5">
          <label className="text-sm font-bold text-foreground">
            Nomor / ID Pelanggan
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOrder()}
            placeholder="Contoh: 08123456789 / 123456789012"
            autoFocus
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
          <p className="text-[11px] text-muted-foreground">
            Pastikan nomor / ID yang Anda masukkan benar. Transaksi tidak dapat dibatalkan setelah dikonfirmasi.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOrder}
            disabled={loading || !target.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
            ) : (
              <><ShoppingCart className="h-4 w-4" /> Pesan Sekarang</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function PPOBPage() {
  const { data, isLoading, error } = useSWR("/api/ppob/services", fetcher, {
    revalidateOnFocus: false,
  });

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [orderTarget, setOrderTarget] = useState<any>(null);
  const [lastOrder, setLastOrder] = useState<any>(null);

  const services: any[] = data?.services ?? [];
  const apiError: string | null = data?.error ?? null;

  // Ekstrak kategori unik
  const categories = ["Semua", ...Array.from(new Set(services.map((s) => s.category as string))).sort()];

  // Filter
  const filtered = services.filter((s) => {
    const matchCat = selectedCategory === "Semua" || s.category === selectedCategory;
    const matchSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOrderSuccess = useCallback(() => {
    setLastOrder(orderTarget);
    setOrderTarget(null);
  }, [orderTarget]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-5 max-w-2xl"
    >
      {/* Header */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
            <Wifi className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Layanan PPOB</h1>
            <p className="text-xs text-muted-foreground">
              Pulsa, PLN, PDAM, streaming, dan ratusan layanan digital lainnya
            </p>
          </div>
        </div>
      </motion.div>

      {/* Success Banner */}
      <AnimatePresence>
        {lastOrder && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-800">Pesanan berhasil diproses!</p>
              <p className="text-xs text-emerald-700 truncate">{lastOrder.name}</p>
            </div>
            <button
              onClick={() => setLastOrder(null)}
              className="text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <motion.div variants={staggerItem} className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Cari layanan (pulsa, listrik, dll)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        {/* Category chips */}
        {!isLoading && categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Content */}
      <motion.div variants={staggerItem}>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-bold text-red-600">Gagal memuat layanan PPOB</p>
            <p className="text-xs text-red-500 mt-1">
              {error?.message ?? "Periksa koneksi atau konfigurasi API Key Jagoanpedia"}
            </p>
          </div>
        ) : apiError ? (
          /* Error deskriptif dari server (API Key belum diisi / layanan kosong) */
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <p className="text-sm font-bold text-amber-800">Layanan PPOB Tidak Tersedia</p>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">{apiError}</p>
            <div className="rounded-xl bg-amber-100 border border-amber-200 p-3">
              <p className="text-[11px] font-semibold text-amber-800">Langkah perbaikan untuk Admin:</p>
              <ol className="text-[11px] text-amber-700 mt-1 space-y-1 list-decimal list-inside">
                <li>Tambahkan <code className="bg-amber-200 px-1 rounded">JAGOANPEDIA_API_KEY</code> ke environment variables Vercel/Netlify</li>
                <li>Deploy ulang aplikasi setelah menambahkan env var</li>
                <li>Pastikan akun Jagoanpedia masih aktif dan memiliki saldo</li>
              </ol>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <Wifi className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">
              {search ? `Tidak ada layanan untuk "${search}"` : "Belum ada layanan tersedia"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((service) => (
              <ServiceCard
                key={service.service}
                service={service}
                onOrder={setOrderTarget}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Order Modal */}
      <AnimatePresence>
        {orderTarget && (
          <OrderModal
            service={orderTarget}
            onClose={() => setOrderTarget(null)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
