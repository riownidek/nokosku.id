"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, Smartphone, Globe, Zap } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/components/motion";
import { OTPResultCard } from "@/components/otp-result-card";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Hardcoded quick-select data (Hero-SMS codes) ────────────────────────────

const POPULAR_SERVICES = [
  { code: "wa", name: "WhatsApp",  emoji: "💬" },
  { code: "tg", name: "Telegram",  emoji: "✈️" },
  { code: "ig", name: "Instagram", emoji: "📸" },
  { code: "lf", name: "TikTok",    emoji: "🎵" },
  { code: "go", name: "Gmail",     emoji: "📧" },
  { code: "fb", name: "Facebook",  emoji: "👍" },
];

const POPULAR_COUNTRIES = [
  { id: 2,  name: "Indonesia",  flag: "🇮🇩" },
  { id: 73, name: "Filipina",   flag: "🇵🇭" },
  { id: 46, name: "Malaysia",   flag: "🇲🇾" },
];

interface ActiveOrder {
  id: string;
  number: string;
  productName: string;
  cost: number;
  expiresAt: string;
}

export default function OTPPage() {
  const { data: config } = useSWR("/api/appconfig/public", fetcher, { revalidateOnFocus: false });
  const markupPercent = parseFloat(config?.markup_percent ?? "0");

  const [selectedService, setSelectedService] = useState<typeof POPULAR_SERVICES[0] | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<typeof POPULAR_COUNTRIES[0] | null>(null);

  const [isBuying, setIsBuying] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);

  // Fetch harga untuk service + country yang dipilih dari Hero-SMS via backend
  const priceKey =
    selectedService && selectedCountry
      ? `/api/otp/services?service=${selectedService.code}`
      : null;

  const { data: serviceData, isLoading: loadingPrice } = useSWR<any[]>(priceKey, fetcher);

  // priceEntry: { code, countryId, displayPrice, priceUsd, count, ... }
  const priceEntry   = serviceData?.find(
    (s: any) => s.code === selectedService?.code && s.countryId === selectedCountry?.id
  );
  // Harga tersedia jika: data sudah load, priceEntry ada, cost > 0 (bukan undefined/null)
  const displayPrice = priceEntry?.displayPrice ?? 0;
  const stockCount   = priceEntry?.count ?? 0;
  const priceAvailable = !loadingPrice && priceEntry !== undefined && priceEntry.priceUsd > 0;
  const outOfStock     = !loadingPrice && priceEntry !== undefined && stockCount === 0;

  const canBuy = !!(selectedService && selectedCountry && !isBuying && priceAvailable && stockCount > 0);

  const handleBuy = useCallback(async () => {
    if (!canBuy || !selectedService || !selectedCountry) return;
    setIsBuying(true);
    try {
      const res = await fetch("/api/otp/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service:     selectedService.code,
          country:     selectedCountry.id,
          serviceName: `${selectedService.name} (${selectedCountry.name})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membeli nomor OTP");

      const ord = data.order;
      if (!ord?.id || !ord?.number) throw new Error("Respons API tidak valid. Saldo Anda tidak terpotong.");

      setActiveOrder({
        id:          ord.id,
        number:      ord.number,
        productName: `${selectedService.name} (${selectedCountry.name})`,
        cost:        ord.cost ?? displayPrice,
        expiresAt:   ord.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      setSelectedService(null);
      setSelectedCountry(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsBuying(false);
    }
  }, [canBuy, selectedService, selectedCountry, displayPrice]);

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-5 max-w-lg">

      {/* Header */}
      <motion.div variants={staggerItem}>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Jasa OTP</h1>
            <p className="text-xs text-muted-foreground">Sewa nomor virtual untuk verifikasi — cepat & instan</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!activeOrder ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="rounded-2xl border border-border bg-card p-5 space-y-5"
          >

            {/* ── Pilih Layanan Populer ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <label className="text-sm font-bold text-foreground">Pilih Layanan</label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {POPULAR_SERVICES.map((svc) => {
                  const isSelected = selectedService?.code === svc.code;
                  return (
                    <motion.button
                      key={svc.code}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      onClick={() => {
                        setSelectedService(isSelected ? null : svc);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border py-3 px-2 text-xs font-semibold transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      )}
                    >
                      <span className="text-xl leading-none">{svc.emoji}</span>
                      <span className="truncate w-full text-center">{svc.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── Pilih Negara Populer ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-500" />
                <label className="text-sm font-bold text-foreground">Pilih Negara Server</label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {POPULAR_COUNTRIES.map((country) => {
                  const isSelected = selectedCountry?.id === country.id;
                  return (
                    <motion.button
                      key={country.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      onClick={() => setSelectedCountry(isSelected ? null : country)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border py-3 px-2 text-xs font-semibold transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      )}
                    >
                      <span className="text-xl leading-none">{country.flag}</span>
                      <span className="truncate w-full text-center">{country.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* ── Ringkasan Harga ── */}
            <AnimatePresence>
              {selectedService && selectedCountry && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Layanan</span>
                      <span className="text-sm font-semibold">{selectedService.emoji} {selectedService.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Negara</span>
                      <span className="text-sm font-semibold">{selectedCountry.flag} {selectedCountry.name}</span>
                    </div>
                    <div className="border-t border-primary/10 pt-2 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total yang dibayar</span>
                      {loadingPrice ? (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Memuat harga...
                        </span>
                      ) : outOfStock ? (
                        <span className="text-sm text-red-500 font-semibold">Stok habis</span>
                      ) : priceAvailable ? (
                        <div className="text-right">
                          <span className="text-xl font-black text-primary">{formatRupiah(displayPrice)}</span>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">{stockCount} nomor tersedia</p>
                        </div>
                      ) : priceEntry === undefined && !loadingPrice && serviceData !== undefined ? (
                        <span className="text-sm text-amber-600 font-semibold">Tidak tersedia</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Tombol Beli ── */}
            <motion.button
              onClick={handleBuy}
              disabled={!canBuy}
              whileHover={canBuy ? { scale: 1.02 } : {}}
              whileTap={canBuy ? { scale: 0.96 } : {}}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isBuying ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
              ) : (
                "⚡ Pesan Nomor Sekarang"
              )}
            </motion.button>

            {/* ── Info ── */}
            <p className="text-center text-[11px] text-muted-foreground/70">
              Nomor aktif selama 5 menit. Saldo dikembalikan otomatis jika habis waktu.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="order-result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="max-w-md"
          >
            <OTPResultCard
              orderId={activeOrder.id}
              number={activeOrder.number}
              productName={activeOrder.productName}
              cost={activeOrder.cost}
              expiresAt={activeOrder.expiresAt}
              onCancel={() => setActiveOrder(null)}
              onComplete={() => setActiveOrder(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
