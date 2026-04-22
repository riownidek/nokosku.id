"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OTPResultCard } from "@/components/otp-result-card";
import { toast } from "sonner";
import { staggerContainer, staggerItem } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function OTPPage() {
  const { data: services, isLoading: loadingServices } = useSWR("/api/otp/services", fetcher);
  const { data: countries, isLoading: loadingCountries } = useSWR("/api/otp/countries", fetcher);

  const [openService, setOpenService] = useState(false);
  const [openCountry, setOpenCountry] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);

  const handleBuy = async () => {
    if (!selectedService || !selectedCountry) return;
    setIsBuying(true);
    try {
      const res = await fetch("/api/otp/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: selectedService.code,
          serviceName: selectedService.name,
          country: selectedCountry.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Nomor OTP berhasil dipesan!");
      setActiveOrder({ ...data.order, productName: selectedService.name });
    } catch (err: any) {
      toast.error(err.message || "Gagal memesan nomor");
    } finally {
      setIsBuying(false);
    }
  };

  const totalCost = selectedService?.displayPrice ?? 0;
  const canBuy = selectedService && selectedCountry && !isBuying;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem}>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Sewa Nomor Virtual</h1>
        <p className="mt-1.5 text-muted-foreground">Verifikasi SMS instan dari 100+ negara tanpa nomor pribadi.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!activeOrder ? (
          <motion.div
            key="order-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
              <div>
                <p className="text-base font-bold text-foreground">Pilih Layanan & Negara</p>
                <p className="text-sm text-muted-foreground mt-0.5">Cari aplikasi yang ingin diverifikasi</p>
              </div>

              {/* Service picker */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Aplikasi / Layanan</label>
                <Popover open={openService} onOpenChange={setOpenService}>
                  <PopoverTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      disabled={loadingServices}
                    >
                      {loadingServices ? (
                        <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat layanan...</span>
                      ) : selectedService ? (
                        <div className="flex w-full items-center justify-between">
                          <span className="font-semibold">{selectedService.name}</span>
                          <span className="text-primary font-bold">{formatRupiah(selectedService.displayPrice)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Pilih aplikasi (contoh: WhatsApp)...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-xl" align="start">
                    <Command>
                      <CommandInput placeholder="Cari layanan..." className="border-none focus:ring-0" />
                      <CommandList>
                        <CommandEmpty>Layanan tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {services?.map((svc: any) => (
                            <CommandItem key={svc.code} value={svc.name} onSelect={() => { setSelectedService(svc); setOpenService(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", selectedService?.code === svc.code ? "opacity-100 text-primary" : "opacity-0")} />
                              <div className="flex w-full items-center justify-between">
                                <span>{svc.name}</span>
                                <span className="text-muted-foreground text-xs font-semibold">{formatRupiah(svc.displayPrice)}</span>
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Negara Server</label>
                <Popover open={openCountry} onOpenChange={setOpenCountry}>
                  <PopoverTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      disabled={loadingCountries}
                    >
                      {loadingCountries ? (
                        <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memuat negara...</span>
                      ) : selectedCountry ? (
                        <span className="font-semibold">{selectedCountry.name}</span>
                      ) : (
                        <span className="text-muted-foreground">Pilih negara (contoh: Indonesia)...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-xl" align="start">
                    <Command>
                      <CommandInput placeholder="Cari negara..." />
                      <CommandList>
                        <CommandEmpty>Negara tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {countries?.map((c: any) => (
                            <CommandItem key={c.code} value={c.name} onSelect={() => { setSelectedCountry(c); setOpenCountry(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", selectedCountry?.code === c.code ? "opacity-100 text-primary" : "opacity-0")} />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

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
            </div>
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
