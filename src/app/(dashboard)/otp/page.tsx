"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Loader2, Smartphone, Globe, ChevronDown, Check,
} from "lucide-react";
import { formatRupiah, applyMarkupSync } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/components/motion";
import { OTPResultCard } from "@/components/otp-result-card";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Service  { code: string; name: string; price: number; }
interface Country  { id: number; code: string; name: string; }
interface Operator { id: number; code: string; name: string; }
interface ActiveOrder {
  id: string; number: string; productName: string; cost: number; expiresAt: string;
}

export default function OTPPage() {
  const { data: servicesRaw, isLoading: loadingServices } = useSWR<Service[]>("/api/otp/services", fetcher);
  const { data: config } = useSWR("/api/appconfig/public", fetcher, { revalidateOnFocus: false });
  const markupPercent = parseFloat(config?.markup_percent ?? "0");

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [openService, setOpenService]     = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [openCountry, setOpenCountry]         = useState(false);

  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [openOperator, setOpenOperator]         = useState(false);

  const [isBuying, setIsBuying] = useState(false);
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);

  // Defensive ID extraction
  const serviceId = selectedService?.code || (selectedService as any)?.service_code || (selectedService as any)?.id;
  const countryId = selectedCountry?.code || selectedCountry?.id || (selectedCountry as any)?.country_id;

  // Fetch countries when service selected — pass service_id as required by RumahOTP API
  const { data: countries, isLoading: loadingCountries } = useSWR<Country[]>(
    serviceId ? `/api/otp/countries?service=${serviceId}` : null,
    fetcher
  );

  // Fetch operators when country selected
  const { data: operators, isLoading: loadingOperators } = useSWR<Operator[]>(
    (selectedCountry && countryId) ? `/api/otp/operators?country=${countryId}` : null,
    fetcher
  );

  const services = Array.isArray(servicesRaw) ? servicesRaw : [];

  const totalCost = selectedService
    ? applyMarkupSync(selectedService.price, markupPercent)
    : 0;

  const canBuy = !!(selectedService && selectedCountry && !isBuying);

  const handleBuy = useCallback(async () => {
    if (!canBuy || !selectedService || !selectedCountry) return;
    setIsBuying(true);
    try {
      const res = await fetch("/api/otp/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service:     selectedService.code,
          country:     selectedCountry.code,
          operator:    selectedOperator?.code,
          serviceName: selectedService.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal membeli nomor OTP");

      const ord = data.order;
      if (!ord?.id || !ord?.number) throw new Error("Respons API tidak valid. Saldo Anda tidak terpotong.");

      setActiveOrder({
        id:          ord.id,
        number:      ord.number,
        productName: selectedService.name,
        cost:        totalCost,
        expiresAt:   ord.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
      setSelectedService(null);
      setSelectedCountry(null);
      setSelectedOperator(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsBuying(false);
    }
  }, [canBuy, selectedService, selectedCountry, selectedOperator, totalCost]);

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
            <p className="text-xs text-muted-foreground">Sewa nomor virtual untuk verifikasi</p>
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
            className="rounded-2xl border border-border bg-card p-5 space-y-4"
          >
            {/* Service picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Layanan / Aplikasi</label>
              <Popover open={openService} onOpenChange={setOpenService}>
                <PopoverTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    disabled={loadingServices}
                  >
                    {loadingServices ? (
                      <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat layanan...</span>
                    ) : selectedService ? (
                      <span className="font-semibold">{selectedService.name} — {formatRupiah(applyMarkupSync(selectedService.price, markupPercent))}</span>
                    ) : (
                      <span className="text-muted-foreground">Pilih layanan (contoh: WhatsApp)...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Cari layanan..." />
                    <CommandList>
                      <CommandEmpty>Layanan tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {services.map((svc) => (
                          <CommandItem key={svc.code} value={svc.name} onSelect={() => { setSelectedService(svc); setSelectedCountry(null); setSelectedOperator(null); setOpenService(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedService?.code === svc.code ? "opacity-100 text-primary" : "opacity-0")} />
                            <div className="flex flex-1 items-center justify-between">
                              <span>{svc.name}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Country picker */}
            {selectedService && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Negara Server</label>
                <Popover open={openCountry} onOpenChange={setOpenCountry}>
                  <PopoverTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      disabled={loadingCountries}
                    >
                      {loadingCountries ? (
                        <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat negara...</span>
                      ) : selectedCountry ? (
                        <span className="font-semibold">{(selectedCountry as any).country_name || selectedCountry.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Pilih negara (contoh: Indonesia)...</span>
                      )}
                      <Globe className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-xl" align="start">
                    <Command>
                      <CommandInput placeholder="Cari negara..." />
                      <CommandList>
                        <CommandEmpty>Negara tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {Array.isArray(countries) ? countries.map((c: any) => {
                            const cId = c.country_id ?? c.code ?? c.id;
                            const cName = c.country_name ?? c.name;
                            return (
                              <CommandItem key={cId} value={cName} onSelect={() => { setSelectedCountry(c); setSelectedOperator(null); setOpenCountry(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", countryId === cId ? "opacity-100 text-primary" : "opacity-0")} />
                                {cName}
                              </CommandItem>
                            );
                          }) : (
                            <CommandItem disabled>Data tidak tersedia</CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Operator picker (optional) */}
            {selectedService && selectedCountry && operators && operators.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Operator <span className="text-muted-foreground">(opsional)</span></label>
                <Popover open={openOperator} onOpenChange={setOpenOperator}>
                  <PopoverTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      disabled={loadingOperators}
                    >
                      {loadingOperators ? (
                        <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat operator...</span>
                      ) : selectedOperator ? (
                        <span className="font-semibold">{(selectedOperator as any).operator_name || selectedOperator.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Pilih operator (opsional)...</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-xl" align="start">
                    <Command>
                      <CommandInput placeholder="Cari operator..." />
                      <CommandList>
                        <CommandEmpty>Operator tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {Array.isArray(operators) ? operators.map((op: any) => {
                            const opId = op.operator_id ?? op.code ?? op.id;
                            const opName = op.operator_name ?? op.name;
                            const selectedOpId = selectedOperator?.code || selectedOperator?.id || (selectedOperator as any)?.operator_id;
                            return (
                              <CommandItem key={opId} value={opName} onSelect={() => { setSelectedOperator(op); setOpenOperator(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", selectedOpId === opId ? "opacity-100 text-primary" : "opacity-0")} />
                                {opName}
                              </CommandItem>
                            );
                          }) : (
                            <CommandItem disabled>Data tidak tersedia</CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Order summary */}
            <AnimatePresence>
              {selectedService && totalCost > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total yang dibayar</span>
                      <span className="text-xl font-black text-primary">{formatRupiah(totalCost)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buy button */}
            <motion.button
              onClick={handleBuy}
              disabled={!canBuy}
              whileHover={canBuy ? { scale: 1.02 } : {}}
              whileTap={canBuy ? { scale: 0.96 } : {}}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isBuying ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : "Pesan Nomor Sekarang"}
            </motion.button>
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
