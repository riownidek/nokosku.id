"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah, cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2, Gamepad2, Zap, Wifi, Phone } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { staggerContainer, staggerItem } from "@/components/motion";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const CATEGORIES = [
  { id: "PULSA", label: "Pulsa Reguler", icon: Phone, bg: "bg-blue-50", icon_c: "text-blue-600", active: "border-blue-500 bg-blue-50" },
  { id: "DATA",  label: "Paket Data",   icon: Wifi,     bg: "bg-emerald-50", icon_c: "text-emerald-600", active: "border-emerald-500 bg-emerald-50" },
  { id: "PLN",   label: "Token Listrik", icon: Zap,     bg: "bg-amber-50", icon_c: "text-amber-600", active: "border-amber-500 bg-amber-50" },
  { id: "GAMES", label: "Top Up Game",  icon: Gamepad2, bg: "bg-purple-50", icon_c: "text-purple-600", active: "border-purple-500 bg-purple-50" },
];

export default function PPOBPage() {
  const [selectedCategory, setSelectedCategory] = useState("PULSA");
  const { data: products, isLoading } = useSWR(`/api/ppob/products?category=${selectedCategory}`, fetcher);
  const [openProduct, setOpenProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [target, setTarget] = useState("");
  const [isBuying, setIsBuying] = useState(false);

  const handleBuy = async () => {
    if (!selectedProduct || !target) return;
    setIsBuying(true);
    try {
      const res = await fetch("/api/ppob/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode: selectedProduct.product_code, productName: selectedProduct.product_name, category: selectedCategory, target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.order?.status === "FAILED") {
        toast.error("Transaksi gagal, saldo dikembalikan.");
      } else {
        toast.success("Transaksi berhasil diproses!");
        if (data.order?.sn) toast(`Serial: ${data.order.sn}`, { duration: 10000 });
      }
      setTarget("");
      setSelectedProduct(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan pembelian");
    } finally {
      setIsBuying(false);
    }
  };

  const catTarget = selectedCategory === "PLN" ? "Nomor Meter / ID Pelanggan" : selectedCategory === "GAMES" ? "Player ID" : "Nomor Handphone";
  const catPlaceholder = selectedCategory === "PLN" ? "Contoh: 1402283921" : selectedCategory === "GAMES" ? "Contoh: 12345678(1234)" : "Contoh: 081234567890";

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={staggerItem}>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Layanan PPOB</h1>
        <p className="mt-1.5 text-muted-foreground">Pulsa, paket data, token listrik, dan voucher game dengan harga terbaik.</p>
      </motion.div>

      <motion.div variants={staggerItem} className="grid gap-6 lg:grid-cols-3">
        {/* Category tabs */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Kategori</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSelectedProduct(null); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3.5 text-sm font-semibold text-left transition-all",
                    isActive ? `${cat.active} border-2 shadow-sm` : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <div className={cn("rounded-lg p-2", cat.bg)}>
                    <cat.icon className={cn("h-4 w-4", cat.icon_c)} />
                  </div>
                  {cat.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Purchase form */}
        <div className="lg:col-span-2">
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-border bg-card p-6 space-y-5"
          >
            <div>
              <p className="font-bold text-foreground">Beli Produk</p>
              <p className="text-sm text-muted-foreground">Pilih produk dan masukkan tujuan pengisian</p>
            </div>

            {/* Product picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Pilihan Produk</label>
              <Popover open={openProduct} onOpenChange={setOpenProduct}>
                <PopoverTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="flex w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium hover:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all text-left"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memuat...</span>
                    ) : selectedProduct ? (
                      <div className="flex w-full items-center justify-between">
                        <span className="font-semibold">{selectedProduct.product_name}</span>
                        <span className="text-primary font-bold text-sm">{formatRupiah(selectedProduct.displayPrice)}</span>
                      </div>
                    ) : <span className="text-muted-foreground">Pilih produk...</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-xl" align="start">
                  <Command>
                    <CommandInput placeholder="Cari produk..." />
                    <CommandList>
                      <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {products?.map((p: any) => (
                          <CommandItem key={p.product_code} value={p.product_name} onSelect={() => { setSelectedProduct(p); setOpenProduct(false); }}>
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedProduct?.product_code === p.product_code ? "opacity-100 text-primary" : "opacity-0")} />
                            <div className="flex w-full items-center justify-between">
                              <span className="text-sm">{p.product_name}</span>
                              <span className="text-xs font-bold text-muted-foreground">{formatRupiah(p.displayPrice)}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Target input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{catTarget}</label>
              <input
                type="text"
                placeholder={catPlaceholder}
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="block w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            {/* Summary */}
            <AnimatePresence>
              {selectedProduct && target.length > 4 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-2">
                    {[
                      { label: "Produk", val: selectedProduct.product_name },
                      { label: "Tujuan", val: target },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold text-right max-w-[60%] truncate">{row.val}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold pt-2 border-t border-primary/15">
                      <span>Total Bayar</span>
                      <span className="text-primary text-lg">{formatRupiah(selectedProduct.displayPrice)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={handleBuy}
              disabled={!selectedProduct || target.length < 5 || isBuying}
              whileHover={selectedProduct && target.length >= 5 ? { scale: 1.02 } : {}}
              whileTap={selectedProduct && target.length >= 5 ? { scale: 0.96 } : {}}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isBuying ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : "Bayar Sekarang"}
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
