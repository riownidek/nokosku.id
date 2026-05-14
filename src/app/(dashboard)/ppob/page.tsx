"use client";

/**
 * PPOB Page — Full Client-Side Fetch via corsproxy.io
 *
 * Strategi:
 * 1. Ambil API Key dari /api/ppob/key (auth-protected, server never touches Jagoanpedia directly)
 * 2. Panggil Jagoanpedia melalui corsproxy.io dari browser pengguna
 *    (IP residensial/ISP pengguna → tidak diblokir Cloudflare Bot Fight Mode)
 * 3. Setelah order berhasil di sisi Jagoanpedia, kirim hasilnya ke /api/ppob/order
 *    untuk pemotongan saldo + pencatatan DB
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Wifi, Loader2, Search, X, ShoppingCart,
  CheckCircle2, Smartphone, Zap, Tv, Droplets,
  AlertTriangle, RefreshCw,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/components/motion";
import { mutate as globalMutate } from "swr";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// corsproxy.io endpoint — bypass Cloudflare via browser IP residensial
const JAGOANPEDIA_URL = "https://jagoanpedia.com/api/ppob";
const PROXY_BASE = `https://corsproxy.io/?${encodeURIComponent(JAGOANPEDIA_URL)}`;

const BROWSER_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

// ─── Kategori Ikon ──────────────────────────────────────────────────────────
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

// ─── Service Card ────────────────────────────────────────────────────────────
function ServiceCard({ service, onOrder }: { service: any; onOrder: (s: any) => void }) {
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
          <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{service.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{service.category}</p>
          <p className="mt-2 text-base font-black text-primary">
            {formatRupiah(service.displayPrice ?? service.price)}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Order Modal ─────────────────────────────────────────────────────────────
function OrderModal({
  service,
  apiKey,
  marginAmount,
  onClose,
  onSuccess,
}: {
  service: any;
  apiKey: string;
  marginAmount: number;
  onClose: () => void;
  onSuccess: (order: any) => void;
}) {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOrder = async () => {
    const t = target.trim();
    if (!t) { toast.error("Masukkan nomor / ID pelanggan tujuan."); return; }
    setLoading(true);
    try {
      // ── Step 1: Buat order di Jagoanpedia langsung dari browser ─────────────
      const jagRes = await fetch(PROXY_BASE, {
        method: "POST",
        headers: BROWSER_HEADERS,
        body: JSON.stringify({ key: apiKey, action: "order", service: service.service, target: t }),
      });

      if (!jagRes.ok) {
        const errText = await jagRes.text().catch(() => "no body");
        throw new Error(`Jagoanpedia error [${jagRes.status}]: ${errText.substring(0, 200)}`);
      }

      const jagData = await jagRes.json();
      if (!jagData.success && jagData.data?.status !== "pending") {
        throw new Error(jagData.message ?? "Jagoanpedia menolak pesanan");
      }

      const providerOrderId = jagData.data?.id ?? jagData.data?.order_id ?? `client-${Date.now()}`;
      const providerStatus  = jagData.data?.status ?? "pending";
      const sn              = jagData.data?.sn ?? null;

      // ── Step 2: Kirim hasilnya ke server kita untuk potong saldo & catat DB ─
      const serverRes = await fetch("/api/ppob/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId:       service.service,
          serviceName:     service.name,
          target:          t,
          providerOrderId,
          providerStatus,
          baseCost:        service.price,
          displayPrice:    service.displayPrice ?? service.price,
          sn,
        }),
      });

      const serverData = await serverRes.json();
      if (!serverRes.ok) throw new Error(serverData.error ?? "Gagal mencatat pesanan di server");

      // Refresh saldo
      await globalMutate("/api/profile");
      toast.success(`✅ Pesanan berhasil! ${service.name} → ${t}`);
      onSuccess(serverData.order);
    } catch (err: any) {
      toast.error(err.message ?? "Gagal membuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CategoryIcon category={service.category} />
            </div>
            <div>
              <p className="font-black text-foreground text-sm leading-tight max-w-[200px]">{service.name}</p>
              <p className="text-xs text-muted-foreground">{service.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Biaya</p>
          <p className="text-2xl font-black text-primary">{formatRupiah(service.displayPrice ?? service.price)}</p>
        </div>

        <div className="space-y-2 mb-5">
          <label className="text-sm font-bold text-foreground">Nomor / ID Pelanggan</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleOrder()}
            placeholder="Contoh: 08123456789 / 123456789012"
            autoFocus
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <p className="text-[11px] text-muted-foreground">Pastikan nomor / ID benar. Transaksi tidak dapat dibatalkan.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
            Batal
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOrder}
            disabled={loading || !target.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
              : <><ShoppingCart className="h-4 w-4" /> Pesan Sekarang</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function PPOBPage() {
  // Ambil API Key dari server (auth-protected)
  const { data: keyData, error: keyError } = useSWR("/api/ppob/key", fetcher, {
    revalidateOnFocus: false,
  });

  // Ambil margin PPOB dari settings publik
  const { data: pubConfig } = useSWR("/api/appconfig/public", fetcher, {
    revalidateOnFocus: false,
  });
  const marginAmount = parseFloat(pubConfig?.markup_ppob_percent ?? "0") || 0;

  const [services, setServices]       = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError]     = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [orderTarget, setOrderTarget] = useState<any>(null);
  const [lastOrder, setLastOrder]     = useState<any>(null);

  const apiKey = keyData?.key ?? null;

  // Fetch services dari Jagoanpedia via corsproxy.io (browser → tidak diblokir CF)
  const fetchServices = useCallback(async () => {
    if (!apiKey) return;
    setLoadingServices(true);
    setServicesError(null);
    try {
      const res = await fetch(PROXY_BASE, {
        method: "POST",
        headers: BROWSER_HEADERS,
        body: JSON.stringify({ key: apiKey, action: "services" }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "no body");
        throw new Error(`Gagal memuat layanan [${res.status}]: ${errText.substring(0, 200)}`);
      }

      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error(json.message ?? "Respons layanan tidak valid dari Jagoanpedia");
      }

      // Tambahkan margin ke setiap harga
      const withMargin = json.data.map((s: any) => ({
        ...s,
        displayPrice: (Number(s.price) || 0) + marginAmount,
      }));

      setServices(withMargin);
    } catch (err: any) {
      setServicesError(err.message ?? "Gagal memuat layanan PPOB");
    } finally {
      setLoadingServices(false);
    }
  }, [apiKey, marginAmount]);

  useEffect(() => {
    if (apiKey) fetchServices();
  }, [apiKey, fetchServices]);

  const categories = ["Semua", ...Array.from(new Set(services.map((s) => s.category as string))).sort()];

  const filtered = services.filter((s) => {
    const matchCat    = selectedCategory === "Semua" || s.category === selectedCategory;
    const matchSearch = !search.trim() || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOrderSuccess = useCallback((order: any) => {
    setLastOrder(order);
    setOrderTarget(null);
  }, []);

  // ── Loading API key ────────────────────────────────────────────────────────
  if (!keyData && !keyError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Key tidak ada (belum dikonfigurasi) ────────────────────────────────────
  if (keyError || keyData?.error) {
    return (
      <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-bold text-amber-800">Layanan PPOB Belum Dikonfigurasi</p>
        </div>
        <p className="text-xs text-amber-700">{keyData?.error ?? "Tidak dapat memuat konfigurasi PPOB."}</p>
        <div className="rounded-xl bg-amber-100 p-3 text-[11px] text-amber-700 space-y-1">
          <p className="font-semibold">Langkah perbaikan untuk Admin:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tambahkan <code className="bg-amber-200 px-1 rounded">JAGOANPEDIA_API_KEY</code> ke environment variables Vercel/Netlify</li>
            <li>Redeploy aplikasi setelah env var ditambahkan</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-5 max-w-2xl">
      {/* Header */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100">
            <Wifi className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Layanan PPOB</h1>
            <p className="text-xs text-muted-foreground">Pulsa, PLN, PDAM, streaming, dan ratusan layanan digital lainnya</p>
          </div>
        </div>
      </motion.div>

      {/* Success Banner */}
      <AnimatePresence>
        {lastOrder && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-emerald-800">Pesanan berhasil diproses!</p>
              <p className="text-xs text-emerald-700 truncate">{lastOrder.productName}</p>
            </div>
            <button onClick={() => setLastOrder(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Cari layanan (pulsa, listrik, dll)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
        {!loadingServices && categories.length > 1 && (
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
        {loadingServices ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : servicesError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-600">Gagal memuat layanan PPOB</p>
            </div>
            <p className="text-xs text-red-500">{servicesError}</p>
            <button
              onClick={fetchServices}
              className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Coba Lagi
            </button>
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
              <ServiceCard key={service.service} service={service} onOrder={setOrderTarget} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Order Modal */}
      <AnimatePresence>
        {orderTarget && apiKey && (
          <OrderModal
            service={orderTarget}
            apiKey={apiKey}
            marginAmount={marginAmount}
            onClose={() => setOrderTarget(null)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
