"use client";

/**
 * PPOB Page — Full Client-Side via Direct + corsproxy.io Fallback
 *
 * Alur:
 * 1. Ambil API Key dari /api/ppob/key (auth-protected)
 * 2. Fetch services langsung dari browser ke Jagoanpedia (IP residensial lolos Cloudflare)
 *    → jika CORS error, fallback ke corsproxy.io
 * 3. Order dibuat langsung dari browser
 * 4. Hasil order dikirim ke /api/ppob/order (server) untuk potong saldo + catat DB
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

// ─── PPOB Proxy Endpoint ─────────────────────────────────────────────────────
// Menggunakan proxy internal Next.js untuk menghindari CORS di browser
const INTERNAL_PROXY = "/api/ppob/proxy";

// ─── Category Icon ───────────────────────────────────────────────────────────
function CategoryIcon({ category }: { category: string }) {
  const cat = (category ?? "").toLowerCase();
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
  onClose,
  onSuccess,
}: {
  service: any;
  apiKey: string;
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
      // ── Step 1: Buat order via internal proxy ───────────────────────────────
      const jagRes = await fetch(INTERNAL_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
          action: "order",
          service: service.service ?? service.id,
          target: t,
        })
      });

      const jagData = await jagRes.json();

      if (!jagRes.ok || !jagData.success) {
        throw new Error(jagData.error ?? jagData.message ?? jagData.suggestion ?? "Gagal menghubungi Jagoanpedia.");
      }

      // data.id adalah angka (order ID numerik)
      const providerOrderId = String(jagData.data?.id ?? Date.now());
      const providerStatus  = String(jagData.data?.status ?? "Pending");
      const sn              = jagData.data?.sn ?? null;

      // ── Step 2: Kirim hasil ke server kita untuk potong saldo & catat DB ────
      const serverRes = await fetch("/api/ppob/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId:       service.service ?? service.id,
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
              <p className="font-black text-foreground text-sm leading-tight max-w-[200px]">
                {service.name}
              </p>
              <p className="text-xs text-muted-foreground">{service.category}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Biaya</p>
          <p className="text-2xl font-black text-primary">
            {formatRupiah(service.displayPrice ?? service.price)}
          </p>
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
          <p className="text-[11px] text-muted-foreground">
            Pastikan nomor / ID benar. Transaksi tidak dapat dibatalkan setelah dikonfirmasi.
          </p>
        </div>

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
  const { data: keyData, error: keyError } = useSWR("/api/ppob/key", fetcher, {
    revalidateOnFocus: false,
  });

  const [services, setServices]                   = useState<any[]>([]);
  const [loadingServices, setLoadingServices]     = useState(false);
  const [servicesError, setServicesError]         = useState<string | null>(null);
  const [search, setSearch]                       = useState("");
  const [selectedCategory, setSelectedCategory]   = useState("Semua");
  const [orderTarget, setOrderTarget]             = useState<any>(null);
  const [lastOrder, setLastOrder]                 = useState<any>(null);

  const apiKey = keyData?.key ?? null;

  // ── Fetch services dari Jagoanpedia ────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    if (!apiKey) return;
    setLoadingServices(true);
    setServicesError(null);
    try {
      // ── Menggunakan internal proxy untuk menghindari CORS ───────────────────
      const res = await fetch(INTERNAL_PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey, action: "services" })
      });

      const json = await res.json();

      if (!res.ok || json.success === false) {
        throw new Error(json.suggestion ?? json.error ?? json.message ?? "API Key tidak valid atau Cloudflare memblokir akses.");
      }

      // Normalisasi data — docs tunjukkan object, realita mungkin array
      let raw: any[] = [];
      if (Array.isArray(json.data)) {
        raw = json.data;
      } else if (json.data && typeof json.data === "object") {
        // Jika hanya satu item dikembalikan sebagai object tunggal
        raw = [json.data];
      } else {
        throw new Error("Format respons layanan tidak dikenali");
      }

      if (raw.length === 0) {
        throw new Error("Tidak ada layanan aktif dari Jagoanpedia. Pastikan API Key valid dan akun aktif.");
      }

      // Filter status "Active" saja
      const active = raw.filter((s: any) =>
        !s.status || String(s.status).toLowerCase() === "active"
      );

      // Tidak ada margin dari pubConfig karena markup_ppob_percent bukan public key
      // Margin akan tetap 0 di sisi klien — harga sudah di-set di DB
      // (Aman: server tetap validate ulang)
      setServices(active.map((s: any) => ({
        ...s,
        displayPrice: Number(s.price) || 0,
      })));
    } catch (err: any) {
      setServicesError(err.message ?? "Gagal memuat layanan PPOB");
    } finally {
      setLoadingServices(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey) fetchServices();
  }, [apiKey, fetchServices]);

  const categories = [
    "Semua",
    ...Array.from(new Set(services.map((s) => s.category as string))).sort(),
  ];

  const filtered = services.filter((s) => {
    const matchCat    = selectedCategory === "Semua" || s.category === selectedCategory;
    const matchSearch = !search.trim() || (s.name ?? "").toLowerCase().includes(search.toLowerCase());
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

  // ── Key error / belum dikonfigurasi ───────────────────────────────────────
  if (keyError || keyData?.error) {
    return (
      <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-bold text-amber-800">Layanan PPOB Belum Dikonfigurasi</p>
        </div>
        <p className="text-xs text-amber-700">{keyData?.error ?? "Tidak dapat memuat konfigurasi PPOB."}</p>
        <div className="rounded-xl bg-amber-100 p-3 text-[11px] text-amber-700 space-y-1">
          <p className="font-semibold">Langkah untuk Admin:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tambahkan <code className="bg-amber-200 px-1 rounded">JAGOANPEDIA_API_KEY</code> ke environment variables</li>
            <li>Redeploy aplikasi</li>
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
            <p className="text-xs text-muted-foreground">
              Pulsa, PLN, PDAM, streaming, dan ratusan layanan digital lainnya
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── PPOB Maintenance Banner — ubah PPOB_MAINTENANCE ke false jika layanan aktif kembali ── */}
      {(true) && (
        <motion.div
          variants={staggerItem}
          className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 space-y-4"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100">
              <span className="text-2xl">🔧</span>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-black text-orange-900">Layanan PPOB Sedang Dalam Pemeliharaan</h2>
              <p className="text-sm text-orange-700 mt-1 leading-relaxed">
                Kami sedang melakukan penyesuaian keamanan dengan sistem pihak ketiga
                agar layanan dapat berjalan lebih stabil. Mohon maaf atas ketidaknyamanannya.
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-white/70 border border-orange-200 px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">Layanan yang masih tersedia:</p>
            <div className="flex flex-wrap gap-2">
              <a href="/otp" className="flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-semibold hover:bg-blue-200 transition-colors">
                📱 Jasa OTP
              </a>
              <a href="/deposit" className="flex items-center gap-1.5 text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-semibold hover:bg-emerald-200 transition-colors">
                💰 Top Up Saldo
              </a>
            </div>
          </div>
          <a
            href="https://t.me/infonokoskuid"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition-colors"
          >
            💬 Hubungi CS via Telegram
          </a>
        </motion.div>
      )}
      {/* ── Sembunyikan seluruh konten PPOB saat maintenance ── */}
      {!(true) && (
        <>

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
            <p className="text-xs text-red-500 leading-relaxed">{servicesError}</p>
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
              <ServiceCard
                key={service.service ?? service.id}
                service={service}
                onOrder={setOrderTarget}
              />
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
            onClose={() => setOrderTarget(null)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
