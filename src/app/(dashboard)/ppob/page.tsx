"use client";

/**
 * PPOB Page — H2H.id Integration
 *
 * Optimasi performa:
 * 1. Server-side caching 5 menit di /api/ppob/services (menghindari 10k fetch ulang)
 * 2. Infinite scroll: hanya render 50 produk pertama, sisanya dimuat saat scroll
 * 3. Debounced search 400ms: penyaringan array besar tidak jalan di setiap ketukan
 * 4. Server-side pagination via query params (page, limit, category, search)
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Wifi, Loader2, Search, X, ShoppingCart,
  CheckCircle2, Smartphone, Zap, Tv, Droplets,
  AlertTriangle, RefreshCw, Package, ChevronDown,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/components/motion";
import { mutate as globalMutate } from "swr";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAGE_SIZE = 50; // produk per halaman infinite scroll

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Category Icon ────────────────────────────────────────────────────────────
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
  if (cat.includes("smm") || cat.includes("sosial") || cat.includes("followers"))
    return <Package className="h-5 w-5 text-pink-500" />;
  return <Wifi className="h-5 w-5 text-primary" />;
}

// ─── Service Card ─────────────────────────────────────────────────────────────
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

// ─── Order Modal ──────────────────────────────────────────────────────────────
function OrderModal({
  service,
  onClose,
  onSuccess,
}: {
  service: any;
  onClose: () => void;
  onSuccess: (order: any) => void;
}) {
  const [target, setTarget]   = useState("");
  const [qty, setQty]         = useState(1);
  const [loading, setLoading] = useState(false);

  const isOpenDenom = !!service.isOpenDenom;

  const handleOrder = async () => {
    const t = target.trim();
    if (!t) { toast.error("Masukkan nomor / ID pelanggan tujuan."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/ppob/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode:  service.code ?? service.service,
          target:       t,
          displayPrice: service.displayPrice ?? service.price,
          qty:          isOpenDenom ? qty : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membuat pesanan");

      await globalMutate("/api/profile");
      toast.success(`✅ Pesanan berhasil! ${service.name} → ${t}`);
      onSuccess(data.order);
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
            {formatRupiah((service.displayPrice ?? service.price) * (isOpenDenom ? qty : 1))}
          </p>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-sm font-bold text-foreground">Nomor / ID Pelanggan</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isOpenDenom && handleOrder()}
              placeholder="Contoh: 08123456789 / 123456789012"
              autoFocus
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          {isOpenDenom && (
            <div>
              <label className="text-sm font-bold text-foreground">Jumlah (Qty)</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          )}
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PPOBPage() {
  // Cek kesiapan H2H credentials di server
  const { data: readyData, error: readyError } = useSWR("/api/ppob/key", fetcher, {
    revalidateOnFocus: false,
  });

  // ── State ──────────────────────────────────────────────────────────────────
  const [allServices, setAllServices]           = useState<any[]>([]);
  const [categories, setCategories]             = useState<string[]>(["Semua"]);
  const [loadingServices, setLoadingServices]   = useState(false);
  const [servicesError, setServicesError]       = useState<string | null>(null);
  const [searchInput, setSearchInput]           = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [orderTarget, setOrderTarget]           = useState<any>(null);
  const [lastOrder, setLastOrder]               = useState<any>(null);

  // ── Infinite scroll state ─────────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // ── Debounced search — 400ms delay ───────────────────────────────────────
  const debouncedSearch = useDebounce(searchInput, 400);

  const isReady = readyData?.ready === true;

  // ── Fetch SEMUA produk dari server saat pertama kali (server sudah cache) ─
  const fetchServices = useCallback(async () => {
    if (!isReady) return;
    setLoadingServices(true);
    setServicesError(null);
    try {
      // Ambil halaman 1 dulu — server mengembalikan categories juga
      // Gunakan limit besar agar semua produk tersedia untuk filter client-side
      // (server sudah mem-cache, jadi tidak overload H2H)
      const res  = await fetch("/api/ppob/services?page=1&limit=200");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Gagal memuat layanan PPOB");
      }

      const products: any[] = Array.isArray(json.data) ? json.data : [];
      if (products.length === 0) {
        throw new Error("Tidak ada layanan aktif. Coba lagi nanti.");
      }

      setAllServices(products);
      setVisibleCount(PAGE_SIZE); // reset scroll

      // Ambil kategori dari respons server
      if (Array.isArray(json.categories)) {
        setCategories(["Semua", ...json.categories]);
      } else {
        setCategories(["Semua", ...new Set(products.map((p) => p.category as string))].sort() as string[]);
      }

      // Jika ada lebih banyak halaman, fetch sisanya secara bertahap
      if (json.pagination && json.pagination.totalPages > 1) {
        fetchRemainingPages(json.pagination.totalPages);
      }
    } catch (err: any) {
      setServicesError(err.message ?? "Gagal memuat layanan PPOB");
    } finally {
      setLoadingServices(false);
    }
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch halaman sisanya secara background (non-blocking)
  const fetchRemainingPages = useCallback(async (totalPages: number) => {
    for (let page = 2; page <= totalPages; page++) {
      try {
        const res  = await fetch(`/api/ppob/services?page=${page}&limit=200`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAllServices((prev) => {
            const existingCodes = new Set(prev.map((p) => p.code));
            const newItems = json.data.filter((p: any) => !existingCodes.has(p.code));
            return newItems.length > 0 ? [...prev, ...newItems] : prev;
          });
        }
      } catch {
        break; // stop silently on error
      }
    }
  }, []);

  useEffect(() => {
    if (isReady) fetchServices();
  }, [isReady, fetchServices]);

  // ── Filter produk (dengan debounced search) ───────────────────────────────
  const filtered = useMemo(() => {
    let result = allServices;

    if (selectedCategory !== "Semua") {
      result = result.filter((s) => s.category === selectedCategory);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (s) =>
          (s.name     ?? "").toLowerCase().includes(q) ||
          (s.code     ?? "").toLowerCase().includes(q) ||
          (s.category ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [allServices, selectedCategory, debouncedSearch]);

  // Reset visible count jika filter berubah
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, debouncedSearch]);

  // ── Infinite scroll dengan IntersectionObserver ───────────────────────────
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  // Produk yang benar-benar di-render ke DOM
  const visibleServices = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const handleOrderSuccess = useCallback((order: any) => {
    setLastOrder(order);
    setOrderTarget(null);
  }, []);

  // ── Loading awal ──────────────────────────────────────────────────────────
  if (!readyData && !readyError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── H2H credentials belum dikonfigurasi ──────────────────────────────────
  if (readyError || readyData?.error || !isReady) {
    return (
      <div className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-bold text-amber-800">Layanan PPOB Belum Dikonfigurasi</p>
        </div>
        <p className="text-xs text-amber-700">{readyData?.error ?? "Kredensial H2H.id tidak ditemukan di server."}</p>
        <div className="rounded-xl bg-amber-100 p-3 text-[11px] text-amber-700 space-y-1">
          <p className="font-semibold">Langkah untuk Admin:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Tambahkan <code className="bg-amber-200 px-1 rounded">H2H_MEMBER_ID</code>, <code className="bg-amber-200 px-1 rounded">H2H_PIN</code>, <code className="bg-amber-200 px-1 rounded">H2H_PASSWORD</code> ke environment variables</li>
            <li>Restart aplikasi</li>
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
              {allServices.length > 0 && (
                <span className="ml-1 font-semibold text-primary">
                  ({allServices.length.toLocaleString("id-ID")} produk)
                </span>
              )}
            </p>
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
              <p className="text-xs text-emerald-700 truncate">{lastOrder.productName ?? lastOrder.product_code}</p>
            </div>
            <button onClick={() => setLastOrder(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <motion.div variants={staggerItem} className="space-y-3">
        {/* Input dengan debounce — hanya menyimpan raw input, filter dieksekusi setelah 400ms */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            id="ppob-search"
            type="search"
            placeholder="Cari layanan (pulsa, listrik, dll)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category chips */}
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
              {debouncedSearch
                ? `Tidak ada layanan untuk "${debouncedSearch}"`
                : "Belum ada layanan tersedia"}
            </p>
          </div>
        ) : (
          <>
            {/* Hanya render visibleServices — sisanya dimuat saat scroll */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleServices.map((service) => (
                <ServiceCard
                  key={service.code ?? service.service}
                  service={service}
                  onOrder={setOrderTarget}
                />
              ))}
            </div>

            {/* Sentinel element untuk IntersectionObserver infinite scroll */}
            {visibleCount < filtered.length && (
              <div ref={loadMoreRef} className="mt-4 flex flex-col items-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
                <p className="text-xs text-muted-foreground">
                  Menampilkan {visibleCount.toLocaleString("id-ID")} dari{" "}
                  {filtered.length.toLocaleString("id-ID")} produk...
                </p>
              </div>
            )}

            {/* Info selesai */}
            {visibleCount >= filtered.length && filtered.length > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-center gap-1.5 py-2">
                <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground/70">
                  Semua {filtered.length.toLocaleString("id-ID")} produk telah dimuat
                </p>
              </div>
            )}
          </>
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
